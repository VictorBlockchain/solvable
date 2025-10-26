# Solvable Oracle: Preconditions & Troubleshooting

This note summarizes the conditions that must be met for the oracle to approve math solutions and common pitfalls that can make the oracle appear “not working”.

## Quick Summary
The oracle can be blocked by missing role assignment, incorrect game state, an expired verification window, mismatched submitter address, or an incorrect puzzle type. Most failures are due to preconditions rather than a contract bug.

## Key Preconditions for Oracle Approval
- Role: Caller must have `ORACLE_VERIFIER_ROLE` to call `approveMathSolution` or `batchVerifyMathSolutions`.
- Game exists: `games[gameId].exists == true`.
- Puzzle type: `games[gameId].puzzleType == PuzzleType.Math`.
- Status: `games[gameId].status == GameStatus.VerificationPending`.
- Submission present: `submittedSolutions[gameId][submitter]` must be non-empty and the `submitter` must match the address that called `submitSolution`.
- Not past deadline: `block.timestamp <= games[gameId].verificationDeadline`.

## Common Pitfalls
- Oracle wallet lacks role: Only addresses with `ORACLE_VERIFIER_ROLE` can approve. By default, only the admin has roles and must grant them.
- Wrong submitter address: Using a different address than the one that submitted the solution will fail the submission check.
- Wrong game status: Math submissions require `GameStatus.Active` when submitted; after submission the game moves to `VerificationPending`. Approvals only work in `VerificationPending`.
- Expired verification window: Approvals after the timeout revert. Use `processExpiredVerifications` to reset the game back to `Active`.
- Incorrect proposal setup: For Math puzzles, `solutionHash` must be `0` and `oracleParams` must be set during proposal or the proposal reverts.

## Operational Checklist
1. Propose Math puzzle with `solutionHash = 0` and populated `oracleParams`.
2. Reach `voteThreshold` with `voteOnProposal` so the game enters `Active`.
3. Solver calls `submitSolution(gameId, solution)` which moves the game to `VerificationPending` and sets a deadline.
4. Oracle (with `ORACLE_VERIFIER_ROLE`) calls `approveMathSolution(gameId, solverAddress, true)` before the deadline.

## Useful Constants & Functions
- Oracle verification timeout:
  ```solidity
  uint256 public constant ORACLE_VERIFICATION_TIMEOUT = 24 hours;
  ```
- Reset expired verifications: `processExpiredVerifications()` (returns games to `Active` if deadline passed).
- Role management:
  - Grant role (from admin): `grantRole(ORACLE_VERIFIER_ROLE, oracleAddr)`
  - Check role: `hasRole(ORACLE_VERIFIER_ROLE, oracleAddr)`

## Verified Contract Link (Sei Mainnet)
- Seitrace: https://seitrace.com/address/0x8D4C3640d39C9333bB240dA4881a76269A8A387D?chain=pacific-1&tab=contract

If you encounter a revert, inspect the message or transaction receipt; it will point to the specific precondition that failed (role, state, deadline, or missing submission).