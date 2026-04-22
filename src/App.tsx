import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Wifi, 
  ShieldAlert, 
  ShieldCheck, 
  Terminal as TerminalIcon, 
  Cpu, 
  Users, 
  Activity,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  RefreshCw,
  Monitor,
  Smartphone,
  Router
} from "lucide-react";
import Scanner from "./components/Scanner";
import { analyzeNetworkSecurity, SecurityReport, Vulnerability } from "./lib/gemini";

type State = "idle" | "discovery" | "scanning" | "results" | "analyzing" | "report";

interface WifiNetwork {
  ssid: string;
  bssid: string;
  signal: number;
  security: "WPA2" | "WPA3" | "Open" | "WEP";
  channel: number;
  vulnerable: boolean;
}

interface Device {
  ip: string;
  mac: string;
  name: string;
  type: "pc" | "mobile" | "router" | "iot";
  security: "safe" | "vulnerable" | "unknown";
}

const MOCK_DEVICES: Device[] = [
  { ip: "192.168.1.1", mac: "00:AB:12:CD:34:EF", name: "Gateway Router (Asus)", type: "router", security: "vulnerable" },
  { ip: "192.168.1.12", mac: "44:55:66:77:88:99", name: "Workstation-PRO", type: "pc", security: "safe" },
  { ip: "192.168.1.45", mac: "AA:BB:CC:DD:EE:FF", name: "iPhone-15-Pro", type: "mobile", security: "safe" },
  { ip: "192.168.1.101", mac: "DE:AD:BE:EF:00:11", name: "Smart-Cam-Exterior", type: "iot", security: "vulnerable" },
];

const MOCK_NETWORKS: WifiNetwork[] = [
  { ssid: "Home_WiFi_2.4G", bssid: "00:11:22:33:44:55", signal: -45, security: "WPA2", channel: 6, vulnerable: false },
  { ssid: "TP-Link_Guest", bssid: "AA:BB:CC:DD:EE:FF", signal: -62, security: "Open", channel: 11, vulnerable: true },
  { ssid: "SentryNode_Secure", bssid: "12:34:56:78:90:AB", signal: -30, security: "WPA3", channel: 44, vulnerable: false },
  { ssid: "Linksys_Old", bssid: "99:88:77:66:55:44", signal: -78, security: "WEP", channel: 1, vulnerable: true },
];

const SCAN_LOGS = [
  "Initializing network interface wlan0...",
  "Starting ARP scan on range 192.168.1.0/24",
  "Found device: 192.168.1.1 (MAC: 00:AB:...)",
  "Probing open ports on 192.168.1.1...",
  "Port 80 (HTTP) open. Warning: No HTTPS.",
  "Found device: 192.168.1.12 (MAC: 44:55:...)",
  "Found device: 192.168.1.45 (MAC: AA:BB:...)",
  "Analyzing 192.168.1.101: UpnP vulnerability detected.",
  "Packet capture established, monitoring handshake attempts...",
  "Scan complete. 4 devices found."
];

export default function App() {
  const [state, setState] = useState<State>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [report, setReport] = useState<SecurityReport | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<WifiNetwork | null>(null);
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [realNetworks, setRealNetworks] = useState<WifiNetwork[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // WebSocket Bridge Logic
  useEffect(() => {
    let socket: WebSocket | null = null;
    const isSecure = window.location.protocol === "https:";
    const hostname = window.location.hostname || "localhost";
    
    // Modern browsers block ws:// from https:// pages (Mixed Content)
    // If we are on HTTPS, we try WSS (which will likely fail for local bridge without certs)
    // but the key is to catch the error and inform the user.
    const protocol = isSecure ? "wss:" : "ws:";
    
    const connect = (host: string) => {
      try {
        const protocol = isSecure ? "wss:" : "ws:";
        const url = `${protocol}//${host}:3001`;
        console.log(`[SYSTEM] Attempting hardware bridge connection: ${url}`);
        
        const ws = new WebSocket(url);
        
        ws.onopen = () => {
          console.log(`[BRIDGE] Connected to ${host}`);
          setBridgeConnected(true);
          setLogs(prev => [...prev, `[BRIDGE] Protocol established (${host}). Hardware status: ACTIVE.`]);
          socket = ws;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (Array.isArray(data)) {
              setRealNetworks(data);
            }
          } catch (e) {
            console.error("Invalid bridge data", e);
          }
        };

        ws.onclose = () => {
          if (socket === ws) {
            setBridgeConnected(false);
            setLogs(prev => [...prev, "[BRIDGE] Connection lost. Reverting to emulation."]);
          }
        };

        ws.onerror = () => {
          if (!bridgeConnected && host === "localhost") {
            // Fallback to 127.0.0.1 if localhost fails
            connect("127.0.0.1");
          }
        };

        return ws;
      } catch (err) {
        console.error(`Socket init error for ${host}:`, err);
        return null;
      }
    };

    const initialSocket = connect(hostname === "localhost" ? "localhost" : hostname);

    return () => socket?.close();
  }, []);

  const networksToDisplay = bridgeConnected && realNetworks.length > 0 ? realNetworks : MOCK_NETWORKS;

  useEffect(() => {
    if (state === "scanning") {
      let i = 0;
      const interval = setInterval(() => {
        if (i < SCAN_LOGS.length) {
          setLogs(prev => [...prev, SCAN_LOGS[i]]);
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => setState("results"), 1000);
        }
      }, 800);
      return () => clearInterval(interval);
    }
  }, [state]);

  useEffect(() => {
    // Behavior auto is safer for older browsers
    terminalEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [logs]);

  const startScan = (network?: WifiNetwork) => {
    if (network) setSelectedNetwork(network);
    setState("scanning");
    setLogs(["[SYSTEM] SentryNode console initialized...", `[NET] Target: ${network?.ssid || "Local Environment"}`]);
  };

  const startDiscovery = () => {
    setState("discovery");
    setLogs(["[SYSTEM] Spectrum analyzer engaged...", "Scanning for nearby SSIDs..."]);
  };

  const runAnalysis = async () => {
    setState("analyzing");
    try {
      const info = `
        Devices: ${MOCK_DEVICES.map(d => `${d.name} (${d.ip})`).join(", ")}
        Flags: Router has open Port 80, IoT Camera has UPnP enabled, WPA2-Personal detected.
      `;
      const result = await analyzeNetworkSecurity(info);
      setReport(result);
      setState("report");
    } catch (error) {
      console.error(error);
      setState("results");
    }
  };

  return (
    <div className="h-screen bg-[#0F1115] text-[#E0E0E0] font-sans flex flex-col overflow-hidden select-none">
      {/* Top Navigation Bar */}
      <nav className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-[#16181D]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
            <Wifi className="w-5 h-5 text-[#0F1115]" />
          </div>
          <span className="font-serif italic text-xl tracking-wide">
            WifiGuard <span className="text-amber-500 font-sans not-italic text-xs font-bold uppercase tracking-widest ml-2">v4.2</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase text-white/40 tracking-widest leading-none">Hardware Bridge</span>
            <div className="flex items-center gap-2">
              {!bridgeConnected && (
                <button 
                  onClick={() => window.location.reload()}
                  className="p-1 bg-white/5 hover:bg-white/10 rounded text-amber-500/50 hover:text-amber-500 transition-colors"
                  title="Force Reconnect"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
              <span className={`font-mono text-xs ${bridgeConnected ? 'text-emerald-400' : 'text-amber-200'}`}>
                {bridgeConnected ? 'CONNECTED' : (
                  <button 
                    onClick={() => alert("DIAGNOSI:\n1. Lo script bridge.py è attivo nel terminale?\n2. Sei su http://localhost:3000 (no https)?\n3. Il firewall del Mac blocca la porta 3001?")}
                    className="underline decoration-dotted cursor-help"
                  >
                    EMU_MODE
                  </button>
                )}
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10"></div>
          <button 
            onClick={() => setState("idle")}
            className="px-4 py-2 bg-amber-600/20 border border-amber-500/30 text-amber-500 text-[10px] font-bold uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all"
          >
            Reset Session
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 border-r border-white/10 bg-[#121418] p-6 flex flex-col gap-8">
          <div className="space-y-4">
            <p className="text-[10px] uppercase text-white/30 font-bold tracking-widest">Console Command</p>
            <ul className="space-y-2 text-xs font-medium">
              <li className={`flex items-center gap-3 cursor-pointer transition-colors ${state === 'discovery' ? 'text-amber-500' : 'text-white/60 hover:text-white'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${state === 'discovery' ? 'bg-amber-500' : 'bg-transparent'}`}></div> 
                Environmental Scan
              </li>
              <li className={`flex items-center gap-3 cursor-pointer transition-colors ${state === 'results' ? 'text-amber-500' : 'text-white/60 hover:text-white'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${state === 'results' ? 'bg-amber-500' : 'bg-transparent'}`}></div> 
                Nodes Inventory
              </li>
              <li className={`flex items-center gap-3 cursor-pointer transition-colors ${state === 'report' ? 'text-amber-500' : 'text-white/60 hover:text-white'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${state === 'report' ? 'bg-amber-500' : 'bg-transparent'}`}></div> 
                Security Matrix
              </li>
            </ul>
          </div>
          
          <div className="mt-auto p-4 bg-white/5 border border-white/10 rounded-lg">
            <p className="text-[10px] uppercase text-white/40 mb-2">Process Integrity</p>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"
                initial={{ width: "0%" }}
                animate={{ width: state === 'scanning' ? '75%' : state === 'report' ? '100%' : '10%' }}
              />
            </div>
            <p className="text-[10px] mt-2 text-amber-500/80 font-mono">
              {state === 'idle' && "Standby"}
              {state === 'scanning' && "Analyzing spectrum..."}
              {state === 'results' && "Discovery complete"}
              {state === 'report' && "Report verified"}
            </p>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(circle_at_top_right,_#1a1d24_0%,_#0f1115_50%)]">
          <AnimatePresence mode="wait">
            {state === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto"
              >
                <div className="p-8 border border-white/5 bg-white/5 backdrop-blur-2xl rounded-2xl w-full">
                  <Scanner isScanning={false} onComplete={() => {}} />
                  <h2 className="font-serif italic text-4xl text-white mb-4">Signal Intercept Initializer</h2>
                  <p className="text-white/50 text-sm mb-10 leading-relaxed font-sans px-8">
                    Analizza lo spettro wireless circostante per mappare le reti disponibili e verificarne la robustezza fisica e logica.
                  </p>
                  <button
                    onClick={startDiscovery}
                    className="w-full bg-amber-600 text-[#0F1115] font-black text-xs uppercase tracking-[0.2em] py-4 rounded-lg hover:bg-amber-500 transition-all shadow-[0_4px_20px_rgba(245,158,11,0.2)]"
                  >
                    Engage Proximity Scan
                  </button>
                </div>
              </motion.div>
            )}

            {state === "discovery" && (
              <motion.div 
                key="discovery"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-12 gap-8"
              >
                <div className="col-span-12 lg:col-span-4 bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-white/10 bg-white/5">
                    <h3 className="font-serif italic text-xl">Spectrum Analyzer</h3>
                  </div>
                  <div className="p-8 flex-1 flex flex-col items-center justify-center">
                    <div className="w-48 h-48 rounded-full border border-amber-500/20 relative flex items-center justify-center">
                      <motion.div 
                        className="absolute inset-0 border-t-2 border-amber-500 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                      />
                      <Wifi className="w-12 h-12 text-amber-500 animate-pulse" />
                    </div>
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-8 space-y-4">
                  <div className="flex justify-between items-end mb-2">
                    <h2 className="font-serif italic text-3xl">Ambient Networks</h2>
                    <span className="text-[10px] text-white/40 font-mono">Found: {networksToDisplay.length} nodes</span>
                  </div>
                  <div className="grid gap-3">
                    {networksToDisplay.map((net, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i}
                        className="p-5 bg-white/5 border border-white/10 rounded-xl hover:border-amber-500/50 transition-all group flex items-center justify-between"
                      >
                        <div className="flex items-center gap-6">
                           <div className="text-center">
                             <p className="text-amber-500 text-lg font-mono font-bold leading-none">{net.signal} <span className="text-[10px] opacity-50">dBm</span></p>
                             <div className="w-12 h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                               <div className="h-full bg-amber-500" style={{ width: `${Math.max(10, 100 + net.signal)}%` }}></div>
                             </div>
                           </div>
                           <div>
                             <h4 className="text-white font-serif italic text-xl mb-1 flex items-center gap-2">
                               {net.ssid}
                               {net.vulnerable && <AlertTriangle className="w-4 h-4 text-red-500" />}
                             </h4>
                             <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">BSSID: {net.bssid} • CH: {net.channel} • {net.security}</p>
                           </div>
                        </div>
                        <button 
                          onClick={() => startScan(net)}
                          className="px-6 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-[#0F1115] transition-all rounded"
                        >
                          Intercept
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {state === "scanning" && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-12 gap-8 items-start h-full"
              >
                <div className="col-span-12 lg:col-span-5 flex flex-col h-full bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <div className="p-12 flex-1 flex flex-col items-center justify-center">
                    <Scanner isScanning={true} onComplete={() => {}} />
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-7 bg-black/60 border border-white/10 p-6 rounded-xl font-mono text-[11px] h-full overflow-y-auto custom-scrollbar">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-2 flex gap-3">
                      <span className="text-white/20">{new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}</span>
                      <span className={(log && (log.includes("vulnerability") || log.includes("Warning"))) ? "text-red-400" : "text-amber-500/70"}>
                        {"> "}{log}
                      </span>
                    </div>
                  ))}
                  <motion.div 
                    animate={{ opacity: [0, 1] }} 
                    transition={{ repeat: Infinity, duration: 0.5 }}
                    className="inline-block w-1.5 h-3 bg-amber-500 ml-1 translate-y-0.5"
                  />
                  <div ref={terminalEndRef} />
                </div>
              </motion.div>
            )}

            {(state === "results" || state === "analyzing") && (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="grid grid-cols-12 gap-8"
              >
                {/* Connected Devices List */}
                <section className="col-span-12 lg:col-span-5 bg-white/5 border border-white/10 rounded-xl flex flex-col overflow-hidden min-h-[400px]">
                  <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h2 className="font-serif italic text-xl">Detected Proxy Nodes</h2>
                    <span className="text-[10px] uppercase font-bold tracking-widest bg-white/10 px-2 py-1 rounded text-white/60">
                      {MOCK_DEVICES.length} Entities found
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto font-mono text-[11px]">
                    {MOCK_DEVICES.map((device, idx) => (
                      <div 
                        key={idx}
                        className="p-4 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-white/5 rounded-lg group-hover:bg-amber-500/10 transition-colors">
                            {device.type === "router" && <Router className="w-5 h-5 text-white/40" />}
                            {device.type === "pc" && <Monitor className="w-5 h-5 text-white/40" />}
                            {device.type === "mobile" && <Smartphone className="w-5 h-5 text-white/40" />}
                            {device.type === "iot" && <Cpu className="w-5 h-5 text-white/40" />}
                          </div>
                          <div>
                            <p className="text-white/90 font-sans font-medium text-sm leading-none mb-1">{device.name}</p>
                            <p className="text-white/30 text-[10px] tracking-tight">{device.ip} • {device.mac}</p>
                          </div>
                        </div>
                        {device.security === "vulnerable" ? (
                          <span className="text-red-400 font-bold uppercase tracking-widest text-[9px]">Vulnerable</span>
                        ) : (
                          <span className="text-emerald-400/60 font-bold uppercase tracking-widest text-[9px]">Secure</span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Audit CTA Panel */}
                <section className="col-span-12 lg:col-span-7 flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden">
                  {state === "analyzing" ? (
                    <div className="text-center">
                      <div className="w-20 h-20 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-6 mx-auto" />
                      <h3 className="font-serif italic text-2xl text-white mb-2">Engaging Core AI</h3>
                      <p className="text-white/40 text-xs font-mono">Running exploit probability matrix...</p>
                    </div>
                  ) : (
                    <div className="text-center relative z-10">
                      <div className="w-16 h-16 bg-amber-600/10 rounded-full flex items-center justify-center mb-6 mx-auto border border-amber-500/20">
                        <Activity className="w-8 h-8 text-amber-500" />
                      </div>
                      <h2 className="font-serif italic text-3xl text-white mb-3">Threat Assessment Matrix</h2>
                      <p className="text-white/40 text-sm mb-10 max-w-sm mx-auto leading-relaxed">
                        Incrocia i dati dei nodi rilevati con l'analisi comportamentale dell'IA per generare un piano di difesa.
                      </p>
                      <button
                        onClick={runAnalysis}
                        className="px-12 py-4 bg-white text-[#0F1115] font-black text-xs uppercase tracking-widest rounded-lg hover:bg-amber-500 hover:text-black transition-all"
                      >
                        Generate Defense Protocol
                      </button>
                    </div>
                  )}
                  {/* Background SVG Grid Pattern */}
                  <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
                    <div 
                      className="absolute inset-0" 
                      style={{ 
                        backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
                        backgroundSize: "20px 20px"
                      }} 
                    />
                  </div>
                </section>
              </motion.div>
            )}

            {state === "report" && report && (
              <motion.div
                key="report"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-12 gap-8 pb-12"
              >
                {/* Score Header */}
                <div className="col-span-12 bg-white/5 border border-white/10 rounded-2xl p-10 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <ShieldAlert className="w-48 h-48" />
                  </div>
                  <div className="max-w-xl z-10 text-center md:text-left">
                    <h2 className="font-serif italic text-4xl text-amber-500 mb-4">Security Assessment Protocol</h2>
                    <p className="text-white/60 leading-relaxed italic text-lg pr-4">"{report.overallSummary}"</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center min-w-[180px] z-10 backdrop-blur-md">
                    <p className="text-[10px] uppercase font-black text-white/40 tracking-[0.2em] mb-2">Integrity Score</p>
                    <p className={`text-7xl font-mono font-black tracking-tighter ${report.score < 50 ? 'text-red-500' : 'text-amber-400'}`}>
                      {report.score}%
                    </p>
                  </div>
                </div>

                {/* Findings Grid */}
                <div className="col-span-12 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10"></div>
                    <h3 className="font-serif italic text-xl text-white/40">Critical Deficiencies Identified</h3>
                    <div className="h-px flex-1 bg-white/10"></div>
                  </div>
                  <div className="grid md:grid-cols-1 gap-6">
                    {report.vulnerabilities.map((v, i) => (
                      <VulnerabilityCard key={i} v={v} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Footer Bar */}
      <footer className="h-8 bg-[#0A0C0F] border-t border-white/10 px-8 flex items-center justify-between text-[10px] font-mono text-white/30">
        <div className="flex gap-6 uppercase tracking-wider">
          <span>OP_SEC: <span className="text-amber-500/50">ENGAGED</span></span>
          <span className="h-3 w-px bg-white/10"></span>
          <span>LOCATION: <span className="text-white/50 italic">NODE_INTERNAL</span></span>
          <span className="h-3 w-px bg-white/10"></span>
          <span className="text-emerald-500/50 italic">Encryption: WPA3-SAE-ACTIVE</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-amber-500/50 uppercase tracking-tighter">AI_CORE_LOAD: 42%</span>
          <div className="h-1.5 w-24 bg-white/10 rounded-full relative overflow-hidden">
            <div className="absolute inset-0 w-[42%] bg-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface VulnerabilityCardProps {
  v: Vulnerability;
  key?: string | number;
}

function VulnerabilityCard({ v }: VulnerabilityCardProps) {
  const [showTest, setShowTest] = useState(false);

  const severityStyles = {
    Low: "text-blue-400 border-blue-400/30 bg-blue-400/5",
    Medium: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
    High: "text-orange-500 border-orange-500/30 bg-orange-500/5",
    Critical: "text-red-500 border-red-500/30 bg-red-500/10"
  }[v.severity];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all hover:border-white/20">
      <div className="p-8 flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
            <span className={`text-[9px] font-black uppercase px-2.5 py-1 tracking-widest border ${severityStyles}`}>
              {v.severity}
            </span>
            <h4 className="font-serif italic text-2xl text-white">{v.name}</h4>
          </div>
          <p className="text-white/50 text-sm mb-8 leading-relaxed max-w-2xl">{v.description}</p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 bg-red-950/20 border border-red-500/20 rounded-xl">
              <p className="text-[10px] font-black text-red-500/60 uppercase mb-3 tracking-[0.2em] flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" /> Compromised Vector
              </p>
              <div className="font-mono text-xs bg-black/40 p-3 rounded-lg border border-white/5 text-red-400 leading-relaxed">
                {v.oldData}
              </div>
            </div>
            <div className="p-5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
              <p className="text-[10px] font-black text-emerald-500/60 uppercase mb-3 tracking-[0.2em] flex items-center gap-2">
                <ShieldCheck className="w-3 h-3" /> Secure Protocol Patch
              </p>
              <div className="font-mono text-xs bg-black/40 p-3 rounded-lg border border-white/5 text-emerald-300 leading-relaxed">
                {v.newData}
              </div>
            </div>
          </div>
        </div>

        <div className="md:w-px bg-white/10"></div>

        <div className="md:w-64 flex flex-col gap-4 justify-center items-center">
           <button 
             onClick={() => setShowTest(!showTest)}
             className={`w-full flex flex-col items-center justify-center gap-3 p-6 border rounded-2xl transition-all group ${showTest ? 'bg-amber-600 border-amber-600' : 'bg-white/5 border-white/10 hover:border-amber-500/50'}`}
           >
             <Lock className={`w-8 h-8 transition-colors ${showTest ? 'text-[#0F1115]' : 'text-white/40 group-hover:text-amber-500'}`} />
             <span className={`text-[10px] font-black uppercase tracking-widest ${showTest ? 'text-[#0F1115]' : 'text-white/60'}`}>
               {showTest ? 'Session Active' : 'Engage Test'}
             </span>
           </button>
           <p className="text-[9px] text-white/20 uppercase font-bold tracking-tighter text-center">Protocol: Penetration Simulation v2.1</p>
        </div>
      </div>

      <AnimatePresence>
        {showTest && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 overflow-hidden bg-black/40"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Terminal Output Stream</span>
                </div>
                <div className="flex gap-1.5">
                   <div className="w-2 h-2 rounded-full bg-white/10" />
                   <div className="w-2 h-2 rounded-full bg-white/10" />
                   <div className="w-2 h-2 rounded-full bg-white/10" />
                </div>
              </div>
              <div className="bg-black/60 rounded-xl border border-white/5 p-6 font-mono text-[11px] leading-relaxed text-amber-500/70 shadow-inner">
                {(v.testSimulation || "").split('\n').map((line, idx) => (
                  <p key={idx} className="mb-1">{"> "} {line}</p>
                ))}
                <motion.span 
                   animate={{ opacity: [0, 1] }} 
                   transition={{ repeat: Infinity, duration: 0.6 }}
                   className="inline-block w-2 h-3 bg-amber-500 ml-1 translate-y-0.5"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
