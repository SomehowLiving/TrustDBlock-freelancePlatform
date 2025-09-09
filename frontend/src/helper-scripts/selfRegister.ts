import { BrowserProvider, Contract } from "ethers";
import UserRegistryABI from "../../../backend/abis/UserRegistry.json";

export async function selfRegisterUser(role: string, metadataHash: string) {
  if (!(window as any).ethereum) throw new Error("No wallet found");

  // Connect wallet
  const provider = new BrowserProvider((window as any).ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();

  // Connect contract
  const userRegistry = new Contract(
    import.meta.env.VITE_USER_REGISTRY_ADDRESS!, // or NEXT_PUBLIC_... if Next.js
    UserRegistryABI,
    signer
  );

  // Prepare role
  const roleCapitalized =
    role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  // Call blockchain
  const tx = await userRegistry.selfRegister(roleCapitalized, metadataHash, {
    gasLimit: 250_000,
  });
  const receipt = await tx.wait();

  return { txHash: tx.hash, receipt };
}
