//Gödel's Gambit 
//A gamified version of Gödel's Incompleteness Theorem
// ai-agents create and solve puzzles to win SEI or GoBit
//by dexsta.fun | @dexstadotfun
//A Gamerholic Product

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Solvable is ReentrancyGuard, AccessControl, Pausable {
    using SafeMath for uint256;

    IERC20 internal constant NATIVE_TOKEN = IERC20(address(0)); // Sentinel for native SEI

    enum GameStatus { None, Pending, Active, VerificationPending, Solved, Archived }
    enum PuzzleType { Riddle, Math, Other }
    enum MathProblemType { PrimeCheck, Factorial, Fibonacci, Brocard, Custom }

    bytes32 public constant GAME_VERIFIER_ROLE = keccak256("GAME_VERIFIER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant ORACLE_VERIFIER_ROLE = keccak256("ORACLE_VERIFIER_ROLE");

    struct MathPuzzleParams {
        uint256 maxInput;
        MathProblemType problemType;
        uint256 expectedProperties; // bitmask for multiple conditions
        uint256 customParam1;
        uint256 customParam2;
    }

    struct Game {
        string puzzle;
        bytes32 solutionHash; // For Riddle/Other only
        GameStatus status;
        uint256 pot;
        uint256 entryFee;
        address token;
        address proposer;
        address winner;
        uint256 voteThreshold;
        uint256 challengeThreshold;
        PuzzleType puzzleType;
        bool requireSubmissionFee;
        bool exists;
        address firstSolver;
        string oracleParams; // Encoded MathPuzzleParams for Math only
        uint256 verificationDeadline; // New: Time limit for oracle verification
    }

    mapping(uint256 => Game) public games;
    mapping(uint256 => mapping(address => bool)) public proposalVotes;
    mapping(uint256 => uint256) public proposalApprovals;
    mapping(uint256 => uint256) public proposalDisapprovals;
    mapping(uint256 => mapping(address => bool)) public solutionChallenges;
    mapping(uint256 => uint256) public solutionChallengesCount;
    mapping(uint256 => address) public pastWinners;
    mapping(uint256 => mapping(address => string)) public submittedSolutions;
    mapping(uint256 => uint256) public emergencyWithdrawTimelock;

    uint256 public nextGameId = 1; // Sequential game ID counter starting from 1
    address public houseAddress;
    uint256 public houseCutPercentage = 500; // 5% in basis points
    uint256 public voteThresholdDefault = 5;
    uint256 public challengeThreshold = 3;
    uint256 public challengeFee = 10000000000000000; // 0.01 SEI equiv
    uint256 public constant MAX_VOTES_PER_GAME = 1000;
    uint256 public constant MAX_CHALLENGES_PER_GAME = 50;
    uint256 public constant ORACLE_VERIFICATION_TIMEOUT = 24 hours;

    event PuzzleProposed(uint256 indexed gameId, address indexed proposer, string puzzle, bytes32 solutionHash, uint256 entryFee, address token, uint256 voteThreshold, PuzzleType puzzleType);
    event VoteCast(uint256 indexed gameId, address indexed voter, bool approve);
    event GameActivated(uint256 indexed gameId);
    event DonationReceived(uint256 indexed gameId, address indexed donor, uint256 amount);
    event SolutionSubmitted(uint256 indexed gameId, address indexed player, bool correct, uint256 potSize, uint256 houseCut);
    event PuzzleSolved(uint256 indexed gameId, address indexed solver);
    event SolutionChallenged(uint256 indexed gameId, address indexed challenger, string reason);
    event GameFinalized(uint256 indexed gameId, address indexed winner);
    event GameInvalidated(uint256 indexed gameId);
    event GameReset(uint256 indexed gameId);
    event HouseCutUpdated(uint256 percentage);
    event HouseAddressUpdated(address houseAddress);
    event EntryFeeUpdated(uint256 indexed gameId, uint256 fee);
    event SubmissionFeeToggled(uint256 indexed gameId, bool requireFee);
    event OracleVerificationRequested(uint256 indexed gameId, address indexed submitter, uint256 deadline);
    event MathSolutionVerified(uint256 indexed gameId, address indexed solver, bool approved, address verifier);
    event VerificationExpired(uint256 indexed gameId);
    event EmergencyWithdrawRequested(uint256 indexed requestId, uint256 gameId, uint256 amount);
    event EmergencyWithdrawExecuted(uint256 indexed requestId, uint256 gameId, uint256 amount);

    modifier validGame(uint256 gameId) {
        require(games[gameId].exists, "Game does not exist");
        _;
    }

    modifier onlyActive(uint256 gameId) {
        require(games[gameId].status == GameStatus.Active, "Game not active");
        _;
    }

    modifier onlySolved(uint256 gameId) {
        require(games[gameId].status == GameStatus.Solved, "Game not solved");
        _;
    }

    modifier onlyActiveOrSolved(uint256 gameId) {
        require(games[gameId].status == GameStatus.Active || games[gameId].status == GameStatus.Solved, "Game not active/solved");
        _;
    }

    constructor(address _admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GAME_VERIFIER_ROLE, _admin);
        _grantRole(ORACLE_VERIFIER_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        houseAddress = _admin;
    }

    // Internal function to validate puzzle parameters based on type
    function _validatePuzzleParams(PuzzleType pType, bytes32 solutionHash, string memory oracleParams) internal pure {
        if (pType == PuzzleType.Riddle || pType == PuzzleType.Other) {
            require(solutionHash != bytes32(0), "Riddle/Other requires solution hash");
            require(bytes(oracleParams).length == 0, "Riddle/Other shouldn't have oracle params");
        } else if (pType == PuzzleType.Math) {
            require(solutionHash == bytes32(0), "Math shouldn't use solution hash");
            require(bytes(oracleParams).length > 0, "Math requires oracle params");
        }
    }

    // Internal function to handle fee transfers
    function _transferFees(Game storage game, uint256 houseShare, uint256 proposerShare) internal {
        if (game.token == address(0)) {
            (bool hSuccess, ) = payable(houseAddress).call{value: houseShare}("");
            (bool pSuccess, ) = payable(game.proposer).call{value: proposerShare}("");
            require(hSuccess && pSuccess, "Share transfer failed");
        } else {
            require(IERC20(game.token).transfer(houseAddress, houseShare), "House share failed");
            require(IERC20(game.token).transfer(game.proposer, proposerShare), "Proposer share failed");
        }
    }

    // Propose puzzle with enhanced validation
    function proposePuzzle(
        string memory _puzzle,
        bytes32 _solutionHash,
        uint256 _entryFee,
        address _token,
        uint256 _voteThreshold,
        PuzzleType _puzzleType,
        string memory _oracleParams
    ) external returns (uint256 gameId) {
        require(bytes(_puzzle).length > 0 && bytes(_puzzle).length <= 1000, "Invalid puzzle length");
        require(_entryFee > 0, "Entry fee must be positive");
        require(_voteThreshold > 0 && _voteThreshold <= 100, "Invalid vote threshold");
        
        _validatePuzzleParams(_puzzleType, _solutionHash, _oracleParams);
        
        // Simple sequential ID generation
        gameId = nextGameId;
        nextGameId++;
        uint256 threshold = _voteThreshold == 0 ? voteThresholdDefault : _voteThreshold;
        games[gameId] = Game({
            puzzle: _puzzle,
            solutionHash: _solutionHash,
            status: GameStatus.Pending,
            pot: 0,
            entryFee: _entryFee,
            token: _token,
            proposer: msg.sender,
            winner: address(0),
            voteThreshold: threshold,
            challengeThreshold: challengeThreshold,
            puzzleType: _puzzleType,
            requireSubmissionFee: true,
            exists: true,
            firstSolver: address(0),
            oracleParams: _oracleParams,
            verificationDeadline: 0
        });
        emit PuzzleProposed(gameId, msg.sender, _puzzle, _solutionHash, _entryFee, _token, threshold, _puzzleType);
    }

    // Vote on pending proposal (unchanged)
    function voteOnProposal(uint256 gameId, bool approve) external validGame(gameId) {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Pending, "Not pending");
        require(!proposalVotes[gameId][msg.sender], "Already voted");

        proposalVotes[gameId][msg.sender] = true;
        if (approve) {
            require(proposalApprovals[gameId] < MAX_VOTES_PER_GAME, "Vote cap reached");
            proposalApprovals[gameId]++;
            if (proposalApprovals[gameId] >= game.voteThreshold) {
                game.status = GameStatus.Active;
                emit GameActivated(gameId);
            }
        } else {
            require(proposalDisapprovals[gameId] < MAX_VOTES_PER_GAME, "Vote cap reached");
            proposalDisapprovals[gameId]++;
        }
        emit VoteCast(gameId, msg.sender, approve);
    }

    // Cancel proposal (unchanged)
    function cancelProposal(uint256 gameId) external validGame(gameId) {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Pending, "Not pending");
        require(msg.sender == game.proposer || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Unauthorized");
        game.status = GameStatus.None;
        delete games[gameId];
    }

    // Toggle submission fee (unchanged)
    function toggleSubmissionFee(uint256 gameId, bool _requireFee) external onlyRole(DEFAULT_ADMIN_ROLE) validGame(gameId) {
        games[gameId].requireSubmissionFee = _requireFee;
        emit SubmissionFeeToggled(gameId, _requireFee);
    }

    // Donate to pot (unchanged)
    function donateToGame(uint256 gameId, uint256 amount) external payable nonReentrant whenNotPaused validGame(gameId) onlyActiveOrSolved(gameId) {
        require(amount > 0, "Donation must be positive");
        Game storage game = games[gameId];
        if (game.token == address(0)) {
            require(msg.value == amount, "Incorrect donation");
            (bool success, ) = payable(address(this)).call{value: amount}("");
            require(success, "Donation failed");
            game.pot = game.pot.add(amount);
        } else {
            require(IERC20(game.token).transferFrom(msg.sender, address(this), amount), "Donation failed");
            game.pot = game.pot.add(amount);
        }
        emit DonationReceived(gameId, msg.sender, amount);
    }

    // Fixed: Submit solution with proper fee handling for math puzzles
    function submitSolution(uint256 gameId, string memory _solution) external payable nonReentrant whenNotPaused validGame(gameId) onlyActive(gameId) {
        require(bytes(_solution).length > 0 && bytes(_solution).length <= 500, "Invalid solution length");
        Game storage game = games[gameId];

        uint256 fee = game.entryFee;
        uint256 houseCut = fee.mul(houseCutPercentage).div(10000);
        uint256 potContribution = fee.sub(houseCut);
        uint256 proposerShare = houseCut.div(2);
        uint256 houseShare = houseCut.sub(proposerShare);

        // Handle fee payment based on puzzle type
        if (game.requireSubmissionFee) {
            require(game.token == address(0) ? msg.value == fee : true, "Incorrect native fee");
            if (game.token != address(0)) {
                require(IERC20(game.token).transferFrom(msg.sender, address(this), fee), "Fee transfer failed");
            }
            
            // Only add to pot immediately for non-math puzzles
            if (game.puzzleType != PuzzleType.Math) {
                game.pot = game.pot.add(potContribution);
            }
            // Math puzzles: pot contribution held until verification
        } else {
            require(game.token == address(0) ? msg.value == 0 : true, "No fee required");
        }

        bool correct;
        address solver = msg.sender;

        if (game.puzzleType == PuzzleType.Riddle || game.puzzleType == PuzzleType.Other) {
            // Immediate verification for riddles
            bytes32 submittedHash = keccak256(abi.encodePacked(_solution));
            correct = submittedHash == game.solutionHash;
            
            if (correct) {
                require(game.firstSolver == address(0), "Already solved");
                game.firstSolver = solver;
                game.status = GameStatus.Solved;
                emit PuzzleSolved(gameId, solver);
                
                // Pay fees immediately for verified riddles
                if (game.requireSubmissionFee && houseCut > 0) {
                    _transferFees(game, houseShare, proposerShare);
                }
            }
        } else {
            // Math: Store for oracle verification
            submittedSolutions[gameId][solver] = _solution;
            game.status = GameStatus.VerificationPending;
            game.verificationDeadline = block.timestamp + ORACLE_VERIFICATION_TIMEOUT;
            correct = false; // Provisional until oracle verifies
            
            emit OracleVerificationRequested(gameId, solver, game.verificationDeadline);
        }

        emit SolutionSubmitted(gameId, solver, correct, game.pot, houseCut);
    }

    // Fixed: Oracle verification with fee handling
    function approveMathSolution(uint256 gameId, address _submitter, bool _approved)
        public
        onlyRole(ORACLE_VERIFIER_ROLE)
        validGame(gameId)
    {
        Game storage game = games[gameId];
        require(game.puzzleType == PuzzleType.Math, "Not a math puzzle");
        require(game.status == GameStatus.VerificationPending, "Not awaiting verification");
        require(bytes(submittedSolutions[gameId][_submitter]).length > 0, "No submission found");
        require(block.timestamp <= game.verificationDeadline, "Verification deadline passed");

        if (_approved) {
            require(game.firstSolver == address(0), "Already solved");
            game.firstSolver = _submitter;
            game.status = GameStatus.Solved;
            
            // Add pot contribution and pay fees only upon successful verification
            if (game.requireSubmissionFee) {
                uint256 fee = game.entryFee;
                uint256 houseCut = fee.mul(houseCutPercentage).div(10000);
                uint256 potContribution = fee.sub(houseCut);
                uint256 proposerShare = houseCut.div(2);
                uint256 houseShare = houseCut.sub(proposerShare);
                
                game.pot = game.pot.add(potContribution);
                _transferFees(game, houseShare, proposerShare);
            }
            
            emit PuzzleSolved(gameId, _submitter);
        }
        
        // Clean up submission
        delete submittedSolutions[gameId][_submitter];
        emit MathSolutionVerified(gameId, _submitter, _approved, msg.sender);
        
        // Reset status if no more pending verifications
        if (!_approved) {
            game.status = GameStatus.Active;
            game.verificationDeadline = 0;
        }
    }

    // New: Process expired verifications
    function processExpiredVerifications(uint256 gameId) external validGame(gameId) {
        Game storage game = games[gameId];
        require(game.status == GameStatus.VerificationPending, "Not awaiting verification");
        require(block.timestamp > game.verificationDeadline, "Deadline not yet passed");
        
        game.status = GameStatus.Active;
        game.verificationDeadline = 0;
        emit VerificationExpired(gameId);
    }

    // Batch oracle verification
    function batchVerifyMathSolutions(
        uint256[] calldata gameIds, 
        address[] calldata submitters, 
        bool[] calldata approvals
    ) external onlyRole(ORACLE_VERIFIER_ROLE) {
        require(gameIds.length == submitters.length && submitters.length == approvals.length, 
            "Array length mismatch");
        require(gameIds.length <= 50, "Too many verifications");
        
        for (uint i = 0; i < gameIds.length; i++) {
            approveMathSolution(gameIds[i], submitters[i], approvals[i]);
        }
    }

    // Challenge solution (unchanged)
    function challengeSolution(uint256 gameId, string memory _reason) external payable nonReentrant validGame(gameId) onlySolved(gameId) {
        require(bytes(_reason).length > 0 && bytes(_reason).length <= 200, "Invalid reason length");
        Game storage game = games[gameId];
        require(!solutionChallenges[gameId][msg.sender], "Already challenged");
        require(solutionChallengesCount[gameId] < MAX_CHALLENGES_PER_GAME, "Challenge cap reached");

        uint256 fee = challengeFee;
        if (game.token == address(0)) {
            require(msg.value == fee, "Incorrect challenge fee");
            game.pot = game.pot.add(fee);
        } else {
            require(IERC20(game.token).transferFrom(msg.sender, address(this), fee), "Challenge fee failed");
            game.pot = game.pot.add(fee);
        }

        solutionChallenges[gameId][msg.sender] = true;
        solutionChallengesCount[gameId]++;
        emit SolutionChallenged(gameId, msg.sender, _reason);
    }

    // Finalize game with math verification check
    function finalizeGame(uint256 gameId) external validGame(gameId) onlySolved(gameId) {
        Game storage game = games[gameId];
        require(solutionChallengesCount[gameId] < game.challengeThreshold, "Challenges meet threshold");
        require(hasRole(GAME_VERIFIER_ROLE, msg.sender) || msg.sender == game.proposer || msg.sender == game.firstSolver, "Unauthorized");

        // Additional check for math puzzles
        if (game.puzzleType == PuzzleType.Math) {
            require(game.firstSolver != address(0), "Math puzzle not properly verified");
        }

        game.winner = game.firstSolver;
        game.status = GameStatus.Archived;
        pastWinners[gameId] = game.winner;
        uint256 payout = game.pot;
        game.pot = 0;

        if (game.token == address(0)) {
            (bool success, ) = payable(game.winner).call{value: payout}("");
            require(success, "Payout failed");
        } else {
            require(IERC20(game.token).transfer(game.winner, payout), "Payout failed");
        }

        emit GameFinalized(gameId, game.winner);
    }

    // Invalidate game (unchanged)
    function invalidateGame(uint256 gameId) external validGame(gameId) onlySolved(gameId) {
        Game storage game = games[gameId];
        require(solutionChallengesCount[gameId] >= game.challengeThreshold, "Insufficient challenges");
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || msg.sender == game.proposer, "Unauthorized");

        game.status = GameStatus.Active;
        game.firstSolver = address(0);
        game.winner = address(0);
        emit GameInvalidated(gameId);
    }

    // Reset game (unchanged)
    function resetGame(uint256 gameId) external onlyRole(DEFAULT_ADMIN_ROLE) validGame(gameId) {
        require(games[gameId].status == GameStatus.Archived, "Not archived");
        games[gameId].status = GameStatus.Active;
        games[gameId].firstSolver = address(0);
        games[gameId].winner = address(0);
        emit GameReset(gameId);
    }

    // Admin functions
    function setHouseCutPercentage(uint256 _percentage) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_percentage <= 10000, "Invalid percentage");
        houseCutPercentage = _percentage;
        emit HouseCutUpdated(_percentage);
    }

    function setHouseAddress(address _houseAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_houseAddress != address(0), "Invalid address");
        houseAddress = _houseAddress;
        emit HouseAddressUpdated(_houseAddress);
    }

    function setVoteThresholdDefault(uint256 _threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_threshold > 0 && _threshold <= 100, "Invalid threshold");
        voteThresholdDefault = _threshold;
    }

    function setChallengeThreshold(uint256 _threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_threshold > 0 && _threshold <= 20, "Invalid threshold");
        challengeThreshold = _threshold;
    }

    function setChallengeFee(uint256 _fee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_fee > 0, "Fee must be positive");
        challengeFee = _fee;
    }

    function setEntryFee(uint256 gameId, uint256 _entryFee) external onlyRole(DEFAULT_ADMIN_ROLE) validGame(gameId) {
        require(_entryFee >= 0, "Invalid fee");
        games[gameId].entryFee = _entryFee;
        emit EntryFeeUpdated(gameId, _entryFee);
    }

    function grantOracleVerifierRole(address _verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ORACLE_VERIFIER_ROLE, _verifier);
    }

    // Emergency withdraw (unchanged)
    function requestEmergencyWithdraw(uint256 gameId, uint256 amount) external onlyRole(EMERGENCY_ROLE) validGame(gameId) {
        require(amount <= games[gameId].pot, "Amount exceeds pot");
        uint256 requestId = uint256(keccak256(abi.encodePacked(gameId, block.timestamp, msg.sender)));
        emergencyWithdrawTimelock[requestId] = block.timestamp + 24 hours;
        emit EmergencyWithdrawRequested(requestId, gameId, amount);
    }

    function executeEmergencyWithdraw(uint256 requestId, uint256 gameId, uint256 amount) external onlyRole(EMERGENCY_ROLE) validGame(gameId) {
        require(block.timestamp >= emergencyWithdrawTimelock[requestId], "Timelock not expired");
        require(amount <= games[gameId].pot, "Amount exceeds pot");
        Game storage game = games[gameId];
        if (game.token == address(0)) {
            (bool success, ) = payable(houseAddress).call{value: amount}("");
            require(success, "Withdraw failed");
        } else {
            require(IERC20(game.token).transfer(houseAddress, amount), "Withdraw failed");
        }
        game.pot = game.pot.sub(amount);
        delete emergencyWithdrawTimelock[requestId];
        emit EmergencyWithdrawExecuted(requestId, gameId, amount);
    }

    // View functions
    function getGameDetails(uint256 gameId) external view validGame(gameId) returns (
        Game memory game,
        uint256 approvals,
        uint256 disapprovals,
        uint256 challenges
    ) {
        return (games[gameId], proposalApprovals[gameId], proposalDisapprovals[gameId], solutionChallengesCount[gameId]);
    }

    function getSubmittedSolution(uint256 gameId, address submitter) external view validGame(gameId) returns (string memory) {
        return submittedSolutions[gameId][submitter];
    }

    function getPastWinner(uint256 gameId) external view validGame(gameId) returns (address) {
        return pastWinners[gameId];
    }

    function getPotBalance(uint256 gameId) external view validGame(gameId) returns (uint256) {
        return games[gameId].pot;
    }

    function getActiveGames(uint256 start, uint256 limit) external view returns (uint256[] memory) {
        require(limit > 0 && limit <= 100, "Invalid limit");
        // Sequential listing is deprecated with composite IDs; use off-chain indexer.
        uint256[] memory empty = new uint256[](0);
        return empty;
    }

    // Pause/unpause
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    receive() external payable {}
}