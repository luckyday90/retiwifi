import asyncio
import json
import websockets
import sys
import subprocess
import re

import asyncio
import json
import websockets
import sys
import subprocess
import re
from access_points import get_scanner

async def get_networks():
    """Tenta di scansionare le reti usando vari metodi per massima compatibilità"""
    try:
        # Metodo 1: Libreria access-points (Ottimo per moderni macOS/Linux)
        print("[SYSTEM] Engaged modern scan engine...")
        scanner = get_scanner()
        aps = scanner.get_access_points()
        
        if aps:
            networks = []
            for ap in aps:
                networks.append({
                    "ssid": ap.ssid if ap.ssid else "Hidden Network",
                    "bssid": ap.bssid,
                    "signal": ap.quality,
                    "security": "WPA2/WPA3",
                    "channel": "Auto",
                    "vulnerable": ap.quality < -75
                })
            return networks
    except Exception as e:
        print(f"[WARN] Metodo moderno fallito: {e}. Provo metodo legacy...")

    # Metodo 2: Legacy Airport (per vecchi macOS)
    try:
        # Cerchiamo airport in vari percorsi possibili
        paths = [
            "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport",
            "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/A/Resources/airport",
            "/usr/sbin/airport"
        ]
        
        airport_path = None
        for p in paths:
            if subprocess.call(["test", "-e", p]) == 0:
                airport_path = p
                break
        
        if airport_path:
            cmd = f"{airport_path} -s"
            result = subprocess.check_output(cmd, shell=True).decode('utf-8')
            lines = result.split('\n')
            networks = []
            for line in lines[1:]:
                if not line.strip(): continue
                match = re.search(r'([0-9a-fA-F:]{17})\s+([-0-9]+)\s+([0-9,+-]+)', line)
                if match:
                    bssid = match.group(1)
                    rssi = int(match.group(2))
                    channel = match.group(3)
                    ssid = line[:match.start()].strip()
                    networks.append({
                        "ssid": ssid if ssid else "Hidden Network",
                        "bssid": bssid,
                        "signal": rssi,
                        "security": "WPA2/WPA3",
                        "channel": channel,
                        "vulnerable": rssi < -75
                    })
            return networks
    except:
        pass

    return []

async def scan_and_send(websocket, path=None):
    print("--- [WifiGuard Hardware Bridge] ---")
    print("Stato: Client connesso.")
    
    while True:
        try:
            networks = await get_networks()
            
            if not networks:
                # Se non troviamo nulla, mandiamo un segnale di "permessi mancanti" o "wifi spento"
                networks = [{"ssid": "ERRORE: Wi-Fi Spento o Permessi mancanti", "bssid": "00:00:00:00:00:00", "signal": -100, "security": "NONE", "channel": 0, "vulnerable": True}]

            await websocket.send(json.dumps(networks))
            print(f"Aggiornamento inviato: {len(networks)} reti rilevate.")
            await asyncio.sleep(4)
        except websockets.exceptions.ConnectionClosed:
            print("Stato: Client disconnesso.")
            break
        except Exception as e:
            print(f"Errore loop bridge: {e}")
            await asyncio.sleep(2)

async def main():
    # Ascolta su tutti gli indirizzi cosi funziona anche se usi l'IP del Mac
    print("Hardware Bridge avviato su ws://0.0.0.0:3001")
    async with websockets.serve(scan_and_send, "0.0.0.0", 3001):
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nBridge arrestato.")
