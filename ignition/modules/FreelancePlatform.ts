// ignition/modules/FreelancePlatform.ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DeployFreelancePlatformContract", (m) => {
  const FreelancePlatform = m.contract("FreelancePlatform"); // Replace with your contract name
  return { FreelancePlatform };
});
