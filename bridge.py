import asyncio
import json
import websockets
import sys
import subprocess
import re

print("--- WifiGuard Hardware Bridge Starting ---")

async def get_networks():
    networks = []
    # Metodo ultra-semplificato via linea di comando
    try:
        # Percorso universale su Mac
        cmd = "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s"
        result = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT).decode('utf-8')
        lines = result.split('\n')
        for line in lines[1:]:
            if not line.strip(): continue
            match = re.search(r'([0-9a-fA-F:]{17})\s+([-0-9]+)\s+([0-9,+-]+)', line)
            if match:
                bssid = match.group(1)
                rssi = int(match.group(2))
                ssid = line[:match.start()].strip()
                networks.append({
                    "ssid": ssid if ssid else "Hidden",
                    "bssid": bssid,
                    "signal": rssi,
                    "security": "WPA2",
                    "channel": 0,
                    "vulnerable": rssi < -75
                })
    except Exception as e:
        # Non stampiamo l'errore ogni 4 secondi per non intasare il terminale
        pass

    return networks

async def handler(websocket):
    print(">>> Browser connected! Sending real data...")
    while True:
        try:
            nets = await get_networks()
            if not nets:
                # Mock data di cortesia se la scansione hardware fallisce ma la connessione c'è
                nets = [{"ssid": "ERRORE: Abilita Localizzazione", "bssid": "00:00", "signal": -100, "security": "NONE", "channel": 0, "vulnerable": True}]
            
            await websocket.send(json.dumps(nets))
            await asyncio.sleep(4)
        except websockets.exceptions.ConnectionClosed:
            print(">>> Browser disconnected.")
            break
        except Exception as e:
            print(f"Error: {e}")
            break

async def main():
    print("Bridge listening on ws://0.0.0.0:3001")
    async with websockets.serve(handler, "0.0.0.0", 3001):
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"FAILED TO START BRIDGE: {e}")
