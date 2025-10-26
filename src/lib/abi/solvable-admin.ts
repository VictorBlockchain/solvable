import { parseAbi } from 'viem'

export const SolvableAdminAbi = parseAbi([
  // Views
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function houseAddress() view returns (address)',
  'function houseCutPercentage() view returns (uint256)',
  'function challengeFee() view returns (uint256)',
  'function voteThresholdDefault() view returns (uint256)',
  'function paused() view returns (bool)',

  // Admin setters
  'function setHouseCutPercentage(uint256 _percentage)',
  'function setHouseAddress(address _houseAddress)',
  'function setVoteThresholdDefault(uint256 _threshold)',
  'function setChallengeThreshold(uint256 _threshold)',
  'function setChallengeFee(uint256 _fee)',
  'function setEntryFee(uint256 gameId, uint256 _entryFee)',
  'function toggleSubmissionFee(uint256 gameId, bool _requireFee)',

  // Roles
  'function grantOracleVerifierRole(address _verifier)',
  'function grantRole(bytes32 role, address account)',

  // Controls
  'function pause()',
  'function unpause()',
])