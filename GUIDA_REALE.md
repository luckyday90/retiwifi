# Guida all'avvio rapido di WifiGuard AI

Ho creato uno script che fa tutto il lavoro per te. Una volta scaricato il progetto sul tuo Mac, non dovrai digitare i comandi uno per uno.

## 1. Scarica e Estrai
1. Vai in **Settings > Export via ZIP**.
2. Estrai la cartella sul tuo Mac.

## 2. Avvio Automatico (Consigliato)
Apri il **Terminale**, trascina la cartella del progetto dentro e scrivi:

```bash
chmod +x setup_and_run.sh
./setup_and_run.sh
```

Questo script:
- Installerà le librerie web (npm).
- Installerà le librerie Python (websockets, access-points).
- Avvierà il **Bridge Hardware** per i dati reali.
- Avvierà l'**Interfaccia Web** su `http://localhost:3000`.

---

## 3. Risoluzione Problemi su macOS
Se lo script Python gira ma non vedi reti:
1. Chiudi lo script (Premi `CTRL+C`).
2. Vai in **Impostazioni di Sistema > Privacy e Sicurezza > Localizzazione**.
3. Assicurati che l'interruttore della Localizzazione sia attivo e che il **Terminale** sia autorizzato.
4. Rilancia `./setup_and_run.sh`.

## 4. Goditi l'Audit Reale
Torna nel browser. Vedrai un pallino verde in alto con scritto **"Hardware Bridge: CONNECTED"**. Ora ogni scansione mostrerà le reti che ti circondano davvero!
