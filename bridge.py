import asyncio
import json
import websockets
import sys
import subprocess
import re

# Protezione contro librerie mancanti
try:
    from access_points import get_scanner
    HAS_SCANNER = True
except ImportError:
    HAS_SCANNER = False

async def get_networks():
    """Tenta di scansionare le reti usando vari metodi"""
    networks = []
    
    # Metodo 1: Libreria access-points
    if HAS_SCANNER:
        try:
            scanner = get_scanner()
            aps = scanner.get_access_points()
            if aps:
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
            print(f"[WARN] Access-points fallito: {e}")

    # Metodo 2: Legacy Airport
    try:
        cmd = "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s"
        result = subprocess.check_output(cmd, shell=True).decode('utf-8')
        lines = result.split('\n')
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
        if networks: return networks
    except:
        pass

    return []

async def scan_and_send(websocket, path=None):
    print("\n" + "="*40)
    print(">>> SUCCESS: WEB BROWSER CONNECTED <<<")
    print("="*40 + "\n")
    
    while True:
        try:
            networks = await get_networks()
            
            if not networks:
                # Feedback visivo se il bridge è connesso ma non vede nulla
                msg = "ERRORE: Abilita Localizzazione nel Terminale" if sys.platform == 'darwin' else "ERRORE: Scansione non riuscita"
                networks = [{"ssid": msg, "bssid": "FF:FF", "signal": -100, "security": "NONE", "channel": 0, "vulnerable": True}]

            await websocket.send(json.dumps(networks))
            await asyncio.sleep(4)
        except websockets.exceptions.ConnectionClosed:
            print("Status: Client Unlinked.")
            break
        except Exception as e:
            print(f"Loop Error: {e}")
            await asyncio.sleep(2)

async def main():
    port = 3001
    print(f"Hardware Bridge init on ws://localhost:{port}")
    try:
        async with websockets.serve(scan_and_send, "0.0.0.0", port):
            await asyncio.Future()
    except Exception as e:
        print(f"CRITICAL: Could not start server on port {port}. Is it already in use?")
        print(f"Details: {e}")

if __name__ == "__main__":
    if not HAS_SCANNER:
        print("[!] Warning: 'access-points' library not found. Falling back to system commands.")
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nBridge offline.")
