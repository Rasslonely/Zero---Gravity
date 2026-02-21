"use client";

import { useState } from "react";
import { connect, disconnect } from "@argent/get-starknet";
import * as starknet from "starknet";

export default function DeployPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, msg]);
    console.log(msg);
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setLogs(["🔄 Wallet disconnected. You can now choose a new wallet."]);
    } catch (e) {
      console.error(e);
    }
  };

  const deployVault = async () => {
    try {
      setLoading(true);
      setLogs([]);
      addLog("🔄 Connecting to Argent X / Braavos...");

      // Try connecting directly via window injection first
      let account: any = null;
      if (typeof window !== "undefined") {
        const wallet = (window as any).starknet_braavos || (window as any).starknet;
        if (wallet) {
          try {
            await wallet.enable({ starknetVersion: "v5" });
            if (wallet.isConnected) {
              account = wallet.account;
            }
          } catch (e) {
            addLog("⚠️ Injected wallet enable failed, trying get-starknet fallback...");
          }
        }
      }

      // Fallback to get-starknet modal if direct injection didn't work
      if (!account) {
        const starknet = await connect({ modalMode: "alwaysAsk" });
        if (!starknet?.account) {
          throw new Error("❌ Wallet connection failed. Please unlock your Starknet extension.");
        }
        account = starknet.account;
      }

      addLog(`✅ Connected as: ${account.address}`);
      addLog("📦 Fetching compiled Vault artifacts from local filesystem...");

      const res = await fetch("/api/artifacts");
      if (!res.ok) throw new Error("❌ Failed to fetch artifacts from API.");
      
      const { sierra, casm } = await res.json();
      addLog("✅ Artifacts loaded successfully.");

      // Calculate class hash
      addLog("🧮 Calculating Class Hash...");
      const classHash = starknet.hash.computeContractClassHash(sierra);
      addLog(`ℹ️ Class Hash: ${classHash}`);

      // Step 1: Initialize Contract Factory
      addLog("🔍 Checking Class status and preparing payload...");
      // Depending on Scarb version, the ABI array could be nested inside .abi or .abi.abi
      let parsedAbi: any = [];
      if (Array.isArray(sierra.abi)) {
          parsedAbi = [...sierra.abi];
      } else if (sierra.abi && Array.isArray(sierra.abi.abi)) {
          parsedAbi = [...sierra.abi]; // Fallback
      }

      // StarknetJS V5 Bugfix: If no constructor is found in ABI, it throws `Cannot read properties of undefined (reading 'inputs')`
      // We explicitly inject an empty constructor so `ContractFactory.deploy()` can safely parse zero arguments.
      const hasConstructor = parsedAbi.some((item: any) => item.type === "constructor");
      if (!hasConstructor) {
        parsedAbi.push({ type: "constructor", name: "constructor", inputs: [], outputs: [] });
      }

      // Step 1: Atomic Declare and Deploy
      addLog("🔍 Requesting Atomic Declare & Deploy (Check your Ready Wallet Extension)");
      addLog("⚠️ NOTE: If the confirm button is greyed out, please make sure you scroll to the bottom of the wallet extension!");
      
      const payload = {
        contract: sierra,
        casm: casm,
        classHash: classHash,
        constructorCalldata: [],
      };

      const deployResponse = await account.declareAndDeploy(payload, { version: 3 });

      addLog(`✅ Transaction submitted: ${deployResponse.deploy.transaction_hash}`);
      addLog(`⏳ Waiting for network confirmation...`);
      await account.waitForTransaction(deployResponse.deploy.transaction_hash);

      const finalAddress = deployResponse.deploy.contract_address;
      
      addLog("");
      addLog("═══════════════════════════════════════════════════════");
      addLog("✅ VAULT DEPLOYED SUCCESSFULLY");
      addLog(`   Contract Address: ${finalAddress}`);
      addLog(`   Class Hash:       ${classHash}`);
      addLog("═══════════════════════════════════════════════════════");
      
    } catch (error: any) {
      addLog(`❌ Fatal Error: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4 border-b border-green-400 pb-2">Vault Deployer (Terminal Bypass)</h1>
      <p className="mb-8 text-gray-400 text-center max-w-2xl">
        Bypassing local Node.js script signature constraints. This interface routes the payload 
        directly to your browser extension (Argent X / Braavos) so their cloud backends can 
        append the guardian multisig payload natively.
      </p>

      <div className="flex gap-4">
        <button 
          onClick={deployVault} 
          disabled={loading}
          className="px-8 py-4 bg-green-500 text-black font-bold text-lg hover:bg-white transition-colors disabled:opacity-50"
        >
          {loading ? "EXECUTING DEPLOYMENT..." : "START PROTOCOL: DEPLOY VAULT"}
        </button>
        <button 
          onClick={handleDisconnect} 
          disabled={loading}
          className="px-8 py-4 bg-red-900 border border-red-500 text-red-100 font-bold text-lg hover:bg-red-500 transition-colors disabled:opacity-50"
        >
          RESET WALLET CONNECTION
        </button>
      </div>

      <div className="mt-8 w-full max-w-3xl border border-green-800 bg-gray-900 p-4 rounded shadow-[0_0_15px_rgba(0,255,0,0.1)]">
        <h2 className="text-xl mb-2 text-white border-b border-gray-700 pb-2">Terminal Output</h2>
        <div className="flex flex-col gap-2 min-h-64 mt-4">
          {logs.map((log, i) => (
            <div key={i} className="break-all">{"> "}{log}</div>
          ))}
          {logs.length === 0 && <div className="text-gray-600 italic">No output yet. Click start.</div>}
        </div>
      </div>
    </div>
  );
}
