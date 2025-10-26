// Minimal ABI for GoBit contract interactions used by server routes
// Keep this aligned with contracts/GoBit.sol

export const GoBitAbi = [
  // Events (optional for decoding)
  {
    type: 'event',
    name: 'PuzzleProposed',
    inputs: [
      { name: 'gameId', type: 'uint256', indexed: true },
      { name: 'proposer', type: 'address', indexed: true },
      { name: 'puzzle', type: 'string', indexed: false },
      { name: 'solutionHash', type: 'bytes32', indexed: false },
      { name: 'entryFee', type: 'uint256', indexed: false },
      { name: 'token', type: 'address', indexed: false },
      { name: 'voteThreshold', type: 'uint256', indexed: false },
      { name: 'puzzleType', type: 'uint8', indexed: false },
    ],
  },
  { type: 'event', name: 'VoteCast', inputs: [
    { name: 'gameId', type: 'uint256', indexed: true },
    { name: 'voter', type: 'address', indexed: true },
    { name: 'approve', type: 'bool', indexed: false },
  ] },
  { type: 'event', name: 'DonationReceived', inputs: [
    { name: 'gameId', type: 'uint256', indexed: true },
    { name: 'donor', type: 'address', indexed: true },
    { name: 'amount', type: 'uint256', indexed: false },
  ] },
  { type: 'event', name: 'SolutionSubmitted', inputs: [
    { name: 'gameId', type: 'uint256', indexed: true },
    { name: 'player', type: 'address', indexed: true },
    { name: 'correct', type: 'bool', indexed: false },
    { name: 'potSize', type: 'uint256', indexed: false },
    { name: 'houseCut', type: 'uint256', indexed: false },
  ] },
  { type: 'event', name: 'OracleVerificationRequested', inputs: [
    { name: 'gameId', type: 'uint256', indexed: true },
    { name: 'submitter', type: 'address', indexed: true },
    { name: 'deadline', type: 'uint256', indexed: false },
  ] },

  // Write functions
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'proposePuzzle',
    inputs: [
      { name: '_puzzle', type: 'string' },
      { name: '_solutionHash', type: 'bytes32' },
      { name: '_entryFee', type: 'uint256' },
      { name: '_token', type: 'address' },
      { name: '_voteThreshold', type: 'uint256' },
      { name: '_puzzleType', type: 'uint8' },
      { name: '_oracleParams', type: 'string' },
    ],
    outputs: [ { name: 'gameId', type: 'uint256' } ],
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'voteOnProposal',
    inputs: [ { name: 'gameId', type: 'uint256' }, { name: 'approve', type: 'bool' } ],
    outputs: [],
  },
  {
    type: 'function',
    stateMutability: 'payable',
    name: 'submitSolution',
    inputs: [ { name: 'gameId', type: 'uint256' }, { name: '_solution', type: 'string' } ],
    outputs: [],
  },
  {
    type: 'function',
    stateMutability: 'payable',
    name: 'challengeSolution',
    inputs: [ { name: 'gameId', type: 'uint256' }, { name: 'reason', type: 'string' } ],
    outputs: [],
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'donateToGame',
    inputs: [ { name: 'gameId', type: 'uint256' }, { name: 'amount', type: 'uint256' } ],
    outputs: [],
  },
  { type: 'function', stateMutability: 'nonpayable', name: 'finalizeGame', inputs: [ { name: 'gameId', type: 'uint256' } ], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'invalidateGame', inputs: [ { name: 'gameId', type: 'uint256' } ], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'resetGame', inputs: [ { name: 'gameId', type: 'uint256' } ], outputs: [] },

  // Read functions
  { type: 'function', stateMutability: 'view', name: 'getActiveGames', inputs: [ { name: 'start', type: 'uint256' }, { name: 'limit', type: 'uint256' } ], outputs: [ { type: 'uint256[]' } ] },
  { type: 'function', stateMutability: 'view', name: 'challengeFee', inputs: [], outputs: [ { type: 'uint256' } ] },
  { type: 'function', stateMutability: 'view', name: 'getGameDetails', inputs: [ { name: 'gameId', type: 'uint256' } ], outputs: [
    {
      type: 'tuple',
      components: [
        { name: 'puzzle', type: 'string' },
        { name: 'solutionHash', type: 'bytes32' },
        { name: 'status', type: 'uint8' },
        { name: 'pot', type: 'uint256' },
        { name: 'entryFee', type: 'uint256' },
        { name: 'token', type: 'address' },
        { name: 'proposer', type: 'address' },
        { name: 'winner', type: 'address' },
        { name: 'voteThreshold', type: 'uint256' },
        { name: 'challengeThreshold', type: 'uint256' },
        { name: 'puzzleType', type: 'uint8' },
        { name: 'requireSubmissionFee', type: 'bool' },
        { name: 'exists', type: 'bool' },
        { name: 'firstSolver', type: 'address' },
        { name: 'oracleParams', type: 'string' },
        { name: 'verificationDeadline', type: 'uint256' },
      ],
    },
    { type: 'uint256' },
    { type: 'uint256' },
    { type: 'uint256' },
  ] },
] as const