// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Interface for UserRegistry contract
interface IUserRegistry {
    // function getUserRole(address wallet) external view returns (string memory);
    function hasRole(
        address wallet,
        string memory role
    ) external view returns (bool);
    // function isUserActive(address wallet) external view returns (bool);
    function isUserRegistered(address wallet) external view returns (bool);
    function isUserActive(address wallet) external view returns (bool);
}

/**
 * @title Complete FreelancePlatform
 * @dev Full-featured monolithic contract with all advanced features
 */
contract FreelancePlatform is Ownable, ReentrancyGuard, AccessControl {
    // ========== ERRORS ==========
    error UnauthorizedCaller();
    error InvalidProject();
    error InvalidAmount();
    error MilestoneNotApproved();
    error AlreadyApproved();
    error AlreadyPaid();
    error NotEnoughFunds();
    error DisputeNotExists();
    error FreelancerAlreadySelected();
    error ProjectNotFunded();
    error InsufficientDeposit();
    error ZeroAmount();
    error InvalidAddress();
    error InvalidDisputedAmount();       // _disputedAmount must be > 0
    error DisputedAmountExceedsMilestone(); // _disputedAmount > milestone.amount
    

    // ========== CONSTANTS ==========
    // uint256 constant SUBMISSION_START_BUFFER = 2 days;
    uint256 constant SUBMISSION_END_BUFFER = 3 days; // from 10days
    // uint256 constant FINAL_SUBMISSION_END_BUFFER = 10 days;
    uint256 constant EXTENSION_REQUEST_CUTOFF_BUFFER = 2 days;
    uint256 constant REVIEW_PERIOD = 5 days;
    uint256 constant AUTO_APPROVE_PERIOD = 7 days;
    uint256 constant DISPUTE_WINDOW = 7 days;// from 14m days

    // ========== ENUMS ==========
    enum ProjectStatus {
        Draft, // Project created but not funded
        Open, // Accepting applications (off-chain)
        Selecting, // Client reviewing applications
        Negotiating, // Selected freelancer, negotiating milestones
        Active, // Work in progress
        Completed, // All milestones done
        Cancelled // Project cancelled
    }

    enum MilestoneStatus {
        Pending, // Created but not submitted
        Submitted, // Work submitted by freelancer
        Approved, // Approved by client
        Paid, // Payment released
        Disputed, // In dispute
        Cancelled, // Milestone cancelled
        Refunded // Refunded to client
    }

    // ========== STRUCTS ==========
    struct Project {
        uint256 id;
        address client;
        address freelancer;
        uint256 totalBudget;
        uint256 escrowBalance;
        ProjectStatus status;
        bool isDisputed;
        uint256 totalMilestones;
        uint256 completedMilestones;
        string metadataHash;
        uint256 createdAt;
        uint256 applicationDeadline;
    }

    struct Milestone {
        uint256 id;
        uint256 projectId;
        uint256 amount;
        uint256 deadline;
        MilestoneStatus status;
        bool extensionRequested;
        string metadataHash;
        uint256 submissionTime;
        bool disputeRaised;
    }

    struct DeliverySubmission {
        uint256 milestoneId;
        string deliveryHash;
        uint256 submissionTime;
        string notes;
    }

    struct ReputationData {
        uint256 totalEarned;
        uint256 projectsCompleted;
        uint256 averageRating;
        uint256 totalRatings;
        bool hasNFT;
    }

    // ========== STATE VARIABLES ==========
    IUserRegistry public userRegistry;

    uint256 public projectCounter;
    uint256 public milestoneCounter;
    uint256 public platformFeePercent = 300; // 3% = 300 basis points
    uint256 public freelancerFeePercent = 250; // 2.5% = 250 basis points

    mapping(uint256 => Project) public projects;
    mapping(uint256 => Milestone) public milestones;
    mapping(uint256 => DeliverySubmission) public deliveries;
    mapping(address => bool) public authorizedAdmins;

    // Selection process mappings
    mapping(uint256 => address[]) public shortlistedFreelancers;
    mapping(uint256 => bool) public freelancerAccepted;
    mapping(uint256 => mapping(address => bool)) public hasApplied;
    mapping(uint256 => mapping(address => bool)) public isShortlisted;

    // Financial tracking
    mapping(uint256 => uint256) public pendingAmounts;
    mapping(uint256 => bool) public clientCancellationRequest;
    mapping(uint256 => bool) public freelancerCancellationRequest;

    // Reputation system (built-in)
    mapping(address => ReputationData) public reputations;
    mapping(address => mapping(uint256 => uint256)) public projectRatings; // user => projectId => rating

    // ========== EVENTS ==========
    event ProjectCreated(uint256 indexed projectId, address indexed client, uint256 budget);
    event FundsDeposited(uint256 indexed projectId, uint256 amount, address indexed client);
    event FreelancerSelected(uint256 indexed projectId, address indexed freelancer);
    event FreelancerAcceptedProject(uint256 indexed projectId, address indexed freelancer);
    event ApplicationSubmitted(uint256 indexed projectId, address indexed freelancer, string proposalHash);
    event MilestoneSubmitted(uint256 indexed milestoneId, uint256 indexed projectId, uint256 amount);
    event MilestoneApproved(uint256 indexed milestoneId, uint256 indexed projectId, address indexed client);
    event PaymentReleased(uint256 indexed milestoneId, uint256 indexed projectId, uint256 amount, address freelancer);
    event MilestoneExtensionRequested(uint256 indexed milestoneId, uint256 indexed projectId);
    event MilestoneExtensionApproved(uint256 indexed milestoneId, uint256 indexed projectId, uint256 newDeadline);
    event MilestoneFinalized(uint256 indexed milestoneId, uint256 indexed projectId, address freelancer);
    event MilestoneCanceled(uint256 indexed milestoneId, uint256 indexed projectId);
    event MilestoneAutoCancelled(uint256 milestoneId, uint256 projectId);
    event DisputeRaised(uint256 indexed projectId, address indexed raisedBy);
    event DisputeResolved(uint256 indexed projectId, address indexed winner, uint256 disputedAmount);
    event ProjectCompleted(uint256 indexed projectId, address indexed freelancer);
    event FreelancersShortlisted(uint256 indexed projectId, address[] freelancers);
    event MilestonesAgreed(uint256 indexed projectId, uint256[] milestoneIds);
    event ProjectActivated(uint256 indexed projectId);
    event ReputationUpdated(address indexed user, uint256 newScore);
    event ProjectRated(uint256 indexed projectId, address indexed rater, uint256 rating);

    // Platform statistics
    uint256 public totalVolumeProcessed;
    uint256 public totalFeesCollected;
    uint256 public totalProjectsCompleted;
    // uint256 public totalRegisteredUsers;

    // ========== MODIFIERS ==========
    modifier onlyClient(uint256 _projectId) {
        if (projects[_projectId].client != msg.sender) revert UnauthorizedCaller();
        _;
    }

    modifier onlyFreelancer(uint256 _projectId) {
        if (projects[_projectId].freelancer != msg.sender) revert UnauthorizedCaller();
        _;
    }

    modifier onlyProjectParticipant(uint256 _projectId) {
        if (msg.sender != projects[_projectId].client && msg.sender != projects[_projectId].freelancer) 
            revert UnauthorizedCaller();
        _;
    }

    modifier projectExists(uint256 _projectId) {
        if (_projectId == 0 || _projectId > projectCounter) revert InvalidProject();
        _;
    }

    modifier milestoneExists(uint256 _milestoneId) {
        require(_milestoneId > 0 && _milestoneId <= milestoneCounter, "Milestone doesn't exist");
        _;
    }

    // modifier validWallet(address wallet) {
    //     require(wallet != address(0), "Invalid wallet address");
    //     _;
    // }
    modifier onlyRegisteredUser(address user) {
        require(userRegistry.isUserRegistered(user), "User not registered");
        _;
    }

    modifier onlyClientRole() {
        require(userRegistry.hasRole(msg.sender, "Client"), "Only clients allowed");
        _;
    }

    modifier onlyFreelancerRole() {
        require(userRegistry.hasRole(msg.sender, "Freelancer"), "Only freelancers allowed");
        _;
    }
    //---------TO CHECK IF THE PERSON APPLYING IS ACTIVE USER OR NOT
    modifier onlyActiveUser() {
        require(userRegistry.isUserActive(msg.sender), "User is inactive");
        _;
    }

    // ========== CONSTRUCTOR ==========
    constructor(address _userRegistryAddress) Ownable(msg.sender) {
        require(_userRegistryAddress != address(0), "Invalid UserRegistry address");
        userRegistry = IUserRegistry(_userRegistryAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        authorizedAdmins[msg.sender] = true;
    }

    // ========== ADMIN FUNCTIONS ==========

function updateUserRegistry(address _userRegistryAddress) external onlyOwner {
    require(_userRegistryAddress != address(0), "Invalid UserRegistry address");
    userRegistry = IUserRegistry(_userRegistryAddress);
}

    // ========== PROJECT CREATION & FUNDING ==========

    function createProject(
        uint256 _totalBudget,
        uint256 _expectedMilestones,
        string calldata _metadataHash,
        uint256 _applicationPeriodDays
    ) external onlyRegisteredUser(msg.sender) onlyClientRole returns (uint256) {
        if (_totalBudget == 0) revert InvalidAmount();
        require(bytes(_metadataHash).length > 0, "Metadata hash required");

        projectCounter++;
        projects[projectCounter] = Project({
            id: projectCounter,
            client: msg.sender,
            freelancer: address(0),
            totalBudget: _totalBudget,
            escrowBalance: 0,
            status: ProjectStatus.Draft,
            isDisputed: false,
            totalMilestones: _expectedMilestones > 0 ? _expectedMilestones : 1,
            completedMilestones: 0,
            metadataHash: _metadataHash,
            createdAt: block.timestamp,
            applicationDeadline: block.timestamp +
                (_applicationPeriodDays * 1 days)
        });

        emit ProjectCreated(projectCounter, msg.sender, _totalBudget);
        return projectCounter;
    }

    function depositFunds(
        uint256 _projectId
    )
        external payable onlyClient(_projectId) projectExists(_projectId) nonReentrant
    {
        Project storage project = projects[_projectId];

        if (msg.value == 0) revert ZeroAmount();
        if (msg.value < project.totalBudget) revert InvalidAmount();
        if (project.freelancer != address(0))
            revert FreelancerAlreadySelected(); //("Project already has freelancer");
        require(project.escrowBalance == 0, "Already funded");
        require(
            project.status == ProjectStatus.Draft,
            "Invalid project status"
        );

        // Calculate platform fee
        uint256 platformFee = (msg.value * platformFeePercent) / 10000;
        uint256 escrowAmount = msg.value - platformFee;

        project.escrowBalance = escrowAmount;
        project.status = ProjectStatus.Open;

        // Track platform statistics
        totalFeesCollected += platformFee;

        // Send fee to platform owner
        if (platformFee > 0) {
            payable(owner()).transfer(platformFee);
        }

        emit FundsDeposited(_projectId, msg.value, msg.sender);
    }

    // ========== APPLICATION & SELECTION PROCESS ==========
    // Replaced onlyRegisteredUser(msg.sender) with onlyActiveUser
    // Now the function checks both registration and active status automatically.
    function applyForProject(
        uint256 _projectId,
        string calldata _proposalHash
    ) external projectExists(_projectId) onlyActiveUser onlyFreelancerRole {
        Project storage project = projects[_projectId];
        require(project.status == ProjectStatus.Open, "Applications not open");
        require(
            block.timestamp <= project.applicationDeadline,
            "Application deadline passed"
        );
        require(!hasApplied[_projectId][msg.sender], "Already applied");
        require(project.client != msg.sender, "Client cannot apply");

        hasApplied[_projectId][msg.sender] = true;
        emit ApplicationSubmitted(_projectId, msg.sender, _proposalHash);
    }

    function shortlistFreelancers(
        uint256 _projectId,
        address[] calldata _freelancers
    ) external onlyClient(_projectId) projectExists(_projectId) {
        Project storage project = projects[_projectId];
        require(project.status == ProjectStatus.Open, "Invalid status");
        require(_freelancers.length > 0, "Cannot create empty shortlist"); // Added this check
        require(_freelancers.length <= 10, "Too many shortlisted");
        require(
            block.timestamp <= project.applicationDeadline,
            "Application period ended"
        );
        // Clear previous shortlist
        delete shortlistedFreelancers[_projectId];
        for (uint i = 0; i < _freelancers.length; i++) {
            require(
                hasApplied[_projectId][_freelancers[i]],
                "Freelancer hasn't applied"
            );
            shortlistedFreelancers[_projectId].push(_freelancers[i]);
            isShortlisted[_projectId][_freelancers[i]] = true;
        }

        project.status = ProjectStatus.Selecting;
        emit FreelancersShortlisted(_projectId, _freelancers);
    }

    function selectFreelancer(
        uint256 _projectId,
        address _freelancer
    ) external projectExists(_projectId) onlyClient(_projectId) {
        Project storage project = projects[_projectId];
        if (_freelancer == address(0)) revert InvalidAddress();
        if (project.freelancer != address(0))
            revert FreelancerAlreadySelected();
        // if (project.escrowBalance < project.totalBudget) revert ProjectNotFunded();
        if (project.status == ProjectStatus.Draft || project.escrowBalance == 0)
            revert ProjectNotFunded();

        // Validate project status
        require( project.status == ProjectStatus.Open ||project.status == ProjectStatus.Selecting,
            "Project not accepting selections"
        );

        // Validate freelancer application/shortlist status
        if (project.status == ProjectStatus.Open) {
            require( hasApplied[_projectId][_freelancer], "Freelancer hasn't applied" );
        } else if (project.status == ProjectStatus.Selecting) {
            require( isShortlisted[_projectId][_freelancer], "Freelancer not shortlisted" );
        }

        project.freelancer = _freelancer;
        project.status = ProjectStatus.Negotiating;

        emit FreelancerSelected(_projectId, _freelancer);
    }

    function acceptProject(
        uint256 _projectId
    ) external onlyFreelancer(_projectId) projectExists(_projectId) {
        require(projects[_projectId].status == ProjectStatus.Negotiating, "Invalid status");
        freelancerAccepted[_projectId] = true;
        emit FreelancerAcceptedProject(_projectId, msg.sender);
    }

    // ========== MILESTONE MANAGEMENT ==========

    function agreeMilestones(
        uint256 _projectId,
        uint256[] calldata _amounts,
        uint256[] calldata _deadlines,
        string[] calldata _metadataHashes
    ) external onlyClient(_projectId) projectExists(_projectId) {
        Project storage project = projects[_projectId];
        require(project.status == ProjectStatus.Negotiating, "Invalid status");
        require(freelancerAccepted[_projectId], "Freelancer hasn't accepted");
        require(
            _amounts.length == _deadlines.length &&
                _amounts.length == _metadataHashes.length,
            "Array mismatch"
        );

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
            require(_deadlines[i] > block.timestamp, "Invalid deadline");
        }
        require(totalAmount <= project.escrowBalance, "Amount exceeds escrow");

        uint256[] memory milestoneIds = new uint256[](_amounts.length);
        for (uint i = 0; i < _amounts.length; i++) {
            milestoneCounter++;

            milestones[milestoneCounter] = Milestone({
                id: milestoneCounter,
                projectId: _projectId,
                amount: _amounts[i],
                deadline: _deadlines[i],
                status: MilestoneStatus.Pending,
                extensionRequested: false,
                metadataHash: _metadataHashes[i],
                submissionTime: 0,
                disputeRaised: false
            });

            pendingAmounts[_projectId] += _amounts[i];
            milestoneIds[i] = milestoneCounter;
        }

        project.status = ProjectStatus.Active;
        project.totalMilestones = _amounts.length;

        emit MilestonesAgreed(_projectId, milestoneIds);
        emit ProjectActivated(_projectId);
    }

    function submitMilestoneWork(
        uint256 _milestoneId,
        string calldata _deliveryHash,
        string calldata _notes
    )
        external
        onlyFreelancer(milestones[_milestoneId].projectId)
        milestoneExists(_milestoneId)
    {
        Milestone storage milestone = milestones[_milestoneId];
        require(
            milestone.status == MilestoneStatus.Pending,
            "Invalid milestone status"
        );
        require(
            block.timestamp <= milestone.deadline + SUBMISSION_END_BUFFER,
            "Submission period expired"
        );

        milestone.status = MilestoneStatus.Submitted;
        milestone.submissionTime = block.timestamp;

        deliveries[_milestoneId] = DeliverySubmission({
            milestoneId: _milestoneId,
            deliveryHash: _deliveryHash,
            submissionTime: block.timestamp,
            notes: _notes
        });

        emit MilestoneSubmitted(
            _milestoneId,
            milestone.projectId,
            milestone.amount
        );
    }
    // ========== PAYMENT & APPROVAL SYSTEM ==========

    function approveMilestone(
        uint256 _milestoneId
    )
        external
        projectExists(milestones[_milestoneId].projectId)
        onlyClient(milestones[_milestoneId].projectId)
        milestoneExists(_milestoneId)
    {
        uint256 projectId = milestones[_milestoneId].projectId;
        Project storage project = projects[projectId];
        require(
            project.status == ProjectStatus.Active,
            "Project is not active"
        );

        Milestone storage milestone = milestones[_milestoneId];
        require(
            milestone.status == MilestoneStatus.Submitted,
            "Milestone not submitted or already processed"
        );
        require(!milestone.disputeRaised, "Milestone is under dispute");

        require(
            block.timestamp <= milestone.deadline + REVIEW_PERIOD,
            "Approval period expired"
        );

        milestone.status = MilestoneStatus.Approved;
        emit MilestoneApproved(_milestoneId, projectId, msg.sender);
    }

    function releaseMilestonePayment(
        uint256 _milestoneId
    )
        external
        projectExists(milestones[_milestoneId].projectId)
        onlyClient(milestones[_milestoneId].projectId)
        nonReentrant
        milestoneExists(_milestoneId)
    {
        uint256 projectId = milestones[_milestoneId].projectId;
        Project storage project = projects[projectId];
        Milestone storage milestone = milestones[_milestoneId];

        require(
            milestone.status == MilestoneStatus.Approved,
            "Milestone not approved"
        );
        require(project.freelancer != address(0), "No freelancer assigned");
        require(milestone.amount > 0, "Invalid amount");

        // Calculate freelancer fee (optional - can be 0 for demo)
        uint256 freelancerFee = (milestone.amount * freelancerFeePercent) /
            10000;
        uint256 netAmount = milestone.amount - freelancerFee;

        milestone.status = MilestoneStatus.Paid;
        pendingAmounts[projectId] -= milestone.amount;
        project.escrowBalance -= milestone.amount;
        project.completedMilestones++;

        // Update reputation
        _updateFreelancerReputation(
            project.freelancer,
            milestone.amount,
            false
        );

        totalVolumeProcessed += milestone.amount;
        totalFeesCollected += freelancerFee;

        // Transfer payment
        payable(project.freelancer).transfer(netAmount);

        // Send freelancer fee to platform (if any)
        if (freelancerFee > 0) {
            payable(owner()).transfer(freelancerFee);
        }

        emit PaymentReleased( _milestoneId, projectId, netAmount, project.freelancer );

        if (project.completedMilestones == project.totalMilestones) {
            _finalizeProject(projectId); // this updates reputation
        }
    }

    function autoApproveMilestone(
        uint256 _milestoneId
    )
        external
        projectExists(milestones[_milestoneId].projectId)
        nonReentrant milestoneExists(_milestoneId)
    {
        uint256 projectId = milestones[_milestoneId].projectId;
        Project storage project = projects[projectId];
        Milestone storage milestone = milestones[_milestoneId];

        require(
            milestone.status == MilestoneStatus.Submitted || milestone.status == MilestoneStatus.Disputed, "Invalid status"
        );
        require(
            block.timestamp > milestone.deadline + AUTO_APPROVE_PERIOD,
            "Auto-approve period not reached"
        );
        require(
            project.escrowBalance >= milestone.amount,
            "Insufficient balance"
        );
        milestone.status = MilestoneStatus.Approved;
        emit MilestoneApproved(_milestoneId, projectId, address(0)); // address(0) = auto-approved

        // Calculate fees
        uint256 freelancerFee = (milestone.amount * freelancerFeePercent) / 10000;
        uint256 netAmount = milestone.amount - freelancerFee;

        milestone.status = MilestoneStatus.Paid;
        project.escrowBalance -= milestone.amount;
        pendingAmounts[projectId] -= milestone.amount;
        project.completedMilestones++;

        // Update reputation and statistics
        _updateFreelancerReputation( project.freelancer, milestone.amount, false ); // ← EVERY auto-approved milestone
        totalVolumeProcessed += milestone.amount;
        totalFeesCollected += freelancerFee;

        // Transfer payments
        payable(project.freelancer).transfer(netAmount);
        if (freelancerFee > 0) {
            payable(owner()).transfer(freelancerFee);
        }

        emit PaymentReleased(_milestoneId, projectId, netAmount, project.freelancer );

        if (project.completedMilestones == project.totalMilestones) {
            _finalizeProject(projectId);
        }
    }

    // ========== EXTENSION SYSTEM ==========

    function requestExtension( uint256 _milestoneId, uint256 _newDeadline )
    external
        projectExists(milestones[_milestoneId].projectId)
        onlyFreelancer(milestones[_milestoneId].projectId)
        milestoneExists(_milestoneId)
    {
        uint256 projectId = milestones[_milestoneId].projectId;
        Project storage project = projects[projectId];
        require( project.status == ProjectStatus.Active, "Project is not active" );

        Milestone storage milestone = milestones[_milestoneId];
        require(block.timestamp <= milestone.deadline - EXTENSION_REQUEST_CUTOFF_BUFFER,
            "Cannot request extension within last 48 hours of milestone deadline"
        );
        require( _newDeadline > milestone.deadline,
            "New deadline must be later than current deadline"
        );
        require(!milestone.extensionRequested, "Extension already requested");

        milestone.extensionRequested = true;
        emit MilestoneExtensionRequested(_milestoneId, projectId);
    }

    function approveExtension(
        uint256 _milestoneId, uint256 _newDeadline
    )
        external
        projectExists(milestones[_milestoneId].projectId)
        onlyClient(milestones[_milestoneId].projectId)
        milestoneExists(_milestoneId)
    {
        uint256 projectId = milestones[_milestoneId].projectId;
        Project storage project = projects[projectId];
        require( project.status == ProjectStatus.Active, "Project is not active"
        );

        Milestone storage milestone = milestones[_milestoneId];
        require(
            milestone.status == MilestoneStatus.Pending,
            "Cannot extend after submission"
        );
        require(
            _newDeadline > milestone.deadline,
            "New deadline must be later than current deadline"
        );
        milestone.deadline = _newDeadline;
        milestone.extensionRequested = false;
        emit MilestoneExtensionApproved(_milestoneId, projectId, _newDeadline);
    }

    // ========== CANCELLATION SYSTEM ==========

    function autoCancelMilestone(
        uint256 _milestoneId
    )
        external
        nonReentrant
        projectExists(milestones[_milestoneId].projectId)
        milestoneExists(_milestoneId)
    {
        Milestone storage milestone = milestones[_milestoneId];
        require(
            milestone.status == MilestoneStatus.Pending,
            "Milestone already submitted"
        );
        require(
            block.timestamp >= milestone.deadline + SUBMISSION_END_BUFFER,
            "Not eligible for auto cancellation"
        );

        uint256 projectId = milestone.projectId;

        // Do cancellation logic directly without calling _cancelMilestone
        payable(projects[projectId].client).transfer(milestone.amount);
        pendingAmounts[projectId] -= milestone.amount;
        projects[projectId].escrowBalance -= milestone.amount;
        milestone.status = MilestoneStatus.Cancelled;
        emit MilestoneAutoCancelled(_milestoneId, projectId);
    }

    function requestMilestoneCancellation(
        uint256 _milestoneId
    ) external nonReentrant milestoneExists(_milestoneId) {
        uint256 projId = milestones[_milestoneId].projectId;
        require(
            projId > 0 && projId <= projectCounter,
            "Project does not exist"
        );

        if (msg.sender == projects[projId].client) {
            clientCancellationRequest[_milestoneId] = true;
        } else if (msg.sender == projects[projId].freelancer) {
            freelancerCancellationRequest[_milestoneId] = true;
        } else {
            revert UnauthorizedCaller();
        }

        if (
            clientCancellationRequest[_milestoneId] &&
            freelancerCancellationRequest[_milestoneId]
        ) {
            _cancelMilestone(_milestoneId);
        }
    }

    function _cancelMilestone(uint256 _milestoneId) internal {
        // Removed nonReentrant since is marked nonReentrant but called from another nonReentrant function
        Milestone storage milestone = milestones[_milestoneId];
        uint256 projId = milestone.projectId;
        require(
            milestone.status == MilestoneStatus.Pending || milestone.status == MilestoneStatus.Submitted,
            "Milestone not cancellable"
        );

        if (milestone.status != MilestoneStatus.Paid) {
            // Refund to client
            payable(projects[projId].client).transfer(milestone.amount);
            pendingAmounts[projId] -= milestone.amount;
            projects[projId].escrowBalance -= milestone.amount;
        }
        milestone.status = MilestoneStatus.Cancelled;
        emit MilestoneCanceled(_milestoneId, projId);
    }

    // ========== DISPUTE SYSTEM ==========

    function disputeMilestone(
        uint256 _milestoneId
    )
        external
        projectExists(milestones[_milestoneId].projectId)
        onlyProjectParticipant(milestones[_milestoneId].projectId)
        milestoneExists(_milestoneId)
    {
        Milestone storage milestone = milestones[_milestoneId];
        require(
            milestone.status == MilestoneStatus.Submitted,
            "Milestone not in submitted state"
        );

        require(
            block.timestamp <= milestone.deadline + DISPUTE_WINDOW,
            "Dispute window expired"
        );
        require(!milestone.disputeRaised, "Dispute already raised");

        milestone.status = MilestoneStatus.Disputed;
        milestone.disputeRaised = true;
        uint256 projId = milestone.projectId;
        projects[projId].isDisputed = true;
        emit DisputeRaised(projId, msg.sender);
    }

    function resolveDispute(
        uint256 _milestoneId, address _winner, uint256 _disputedAmount
    ) external onlyOwner milestoneExists(_milestoneId) {
        uint256 projectId = milestones[_milestoneId].projectId;
        require(projectId > 0 && projectId <= projectCounter, "Invalid project");
        require(projects[projectId].isDisputed, "No dispute exists");
        // check disputedAmount
        if (_disputedAmount == 0) revert InvalidDisputedAmount();
        if (_disputedAmount > milestones[_milestoneId].amount) revert DisputedAmountExceedsMilestone();
        if (_disputedAmount > projects[projectId].escrowBalance) revert NotEnoughFunds();

        projects[projectId].isDisputed = false;

        if (_winner == projects[projectId].freelancer) {
            if (milestones[_milestoneId].status != MilestoneStatus.Paid) {
                // Apply freelancer fee before releasing payment
                uint256 freelancerFee = (_disputedAmount * freelancerFeePercent) / 10000;
                uint256 netAmount = _disputedAmount - freelancerFee;

                payable(projects[projectId].freelancer).transfer(netAmount);
                if (freelancerFee > 0) {
                    payable(owner()).transfer(freelancerFee);
                }

                milestones[_milestoneId].status = MilestoneStatus.Paid;
                // Reputation update: milestone payout
                _updateFreelancerReputation( projects[projectId].freelancer, _disputedAmount, false);
                totalVolumeProcessed += _disputedAmount;
                totalFeesCollected += freelancerFee;
            }
        } else if (_winner == projects[projectId].client) {
            payable(projects[projectId].client).transfer(_disputedAmount);
            milestones[_milestoneId].status = MilestoneStatus.Refunded;
        }

        pendingAmounts[projectId] -= _disputedAmount;
        projects[projectId].escrowBalance -= _disputedAmount;
        projects[projectId].completedMilestones++;

        if (
            projects[projectId].completedMilestones == projects[projectId].totalMilestones
        ) {
            _finalizeProject(projectId);
        }
        emit DisputeResolved(projectId, _winner, _disputedAmount);
    }

    // ========== REPUTATION SYSTEM ==========

    function _updateFreelancerReputation( address _freelancer, uint256 _amount, bool _isFinal
    ) internal {
        ReputationData storage rep = reputations[_freelancer];
        // Update earnings if this is tied to a payment
        if (_amount > 0) { rep.totalEarned += _amount; }
        // Update project completions if project is finalized
        if (_isFinal) { rep.projectsCompleted++; }
        // Recalculate reputation score
        uint256 newScore = (rep.totalEarned / 1 ether) + (rep.projectsCompleted * 10);

        emit ReputationUpdated(_freelancer, newScore);
    }

    function rateProject(uint256 _projectId, uint256 _rating
    ) external projectExists(_projectId) onlyProjectParticipant(_projectId) {
        require(_rating >= 1 && _rating <= 5, "Rating must be between 1 and 5");
        require(
            projects[_projectId].status == ProjectStatus.Completed,
            "Project not completed"
        );
        require(projectRatings[msg.sender][_projectId] == 0, "Already rated");

        projectRatings[msg.sender][_projectId] = _rating;

        // Update freelancer reputation if client is rating
        if (msg.sender == projects[_projectId].client) {
            address freelancer = projects[_projectId].freelancer;
            ReputationData storage rep = reputations[freelancer];

            uint256 oldAverage = rep.averageRating;
            uint256 oldCount = rep.totalRatings;

            rep.totalRatings++;
            rep.averageRating =
                ((oldAverage * oldCount) + _rating) / rep.totalRatings;
        }

        emit ProjectRated(_projectId, msg.sender, _rating);
    }

    function getFreelancerReputation( address _freelancer
    ) external view returns (ReputationData memory) {
        return reputations[_freelancer];
    }

    // ========== UTILITY FUNCTIONS ==========

    function _finalizeProject(uint256 _projectId) internal {
        if (projects[_projectId].status == ProjectStatus.Completed) return;

        projects[_projectId].status = ProjectStatus.Completed;
        totalProjectsCompleted++;
        // Reputation update — project completion only
        _updateFreelancerReputation(projects[_projectId].freelancer, 0, true);

        emit ProjectCompleted(_projectId, projects[_projectId].freelancer);
    }

    function emergencyWithdraw(
        uint256 _projectId
    ) external onlyClient(_projectId) nonReentrant {
        Project storage project = projects[_projectId];
        require(
            project.status == ProjectStatus.Draft ||
                project.status == ProjectStatus.Open ||
                project.status == ProjectStatus.Selecting,
            "Cannot withdraw at this stage"
        );
        require(project.escrowBalance > 0, "No funds to withdraw");

        uint256 amount = project.escrowBalance;
        project.escrowBalance = 0;
        project.status = ProjectStatus.Cancelled;

        payable(msg.sender).transfer(amount);
    }

    function withdrawExcessFunds(
        uint256 _projectId
    ) external onlyClient(_projectId) nonReentrant {
        Project storage project = projects[_projectId];
        require(
            project.status == ProjectStatus.Completed,
            "Project not completed"
        );

        uint256 excessAmount = project.escrowBalance -
            pendingAmounts[_projectId];
        if (excessAmount > 0) {
            project.escrowBalance -= excessAmount;
            payable(msg.sender).transfer(excessAmount);
        }
    }

    // ========== VIEW FUNCTIONS ==========

    function getProject(
        uint256 _projectId
    ) external view projectExists(_projectId) returns (Project memory) {
        return projects[_projectId];
    }

    function getMilestone(
        uint256 _milestoneId
    ) external view milestoneExists(_milestoneId) returns (Milestone memory) {
        return milestones[_milestoneId];
    }

    function getDelivery( uint256 _milestoneId )
        external
        view
        milestoneExists(_milestoneId)
        returns (DeliverySubmission memory)
    {
        return deliveries[_milestoneId];
    }

    function getShortlistedFreelancers(
        uint256 _projectId
    ) external view projectExists(_projectId) returns (address[] memory) {
        return shortlistedFreelancers[_projectId];
    }

    function hasFreelancerApplied(
        uint256 _projectId,
        address _freelancer
    ) external view projectExists(_projectId) returns (bool) {
        return hasApplied[_projectId][_freelancer];
    }

    function isFreelancerShortlisted(uint256 _projectId, address _freelancer
    ) external view projectExists(_projectId) returns (bool) {
        return isShortlisted[_projectId][_freelancer];
    }

    function getProjectStatus( uint256 _projectId ) 
    external view projectExists(_projectId) returns (string memory) {
        ProjectStatus status = projects[_projectId].status;
        if (status == ProjectStatus.Draft) return "Draft";
        if (status == ProjectStatus.Open) return "Open";
        if (status == ProjectStatus.Selecting) return "Selecting";
        if (status == ProjectStatus.Negotiating) return "Negotiating";
        if (status == ProjectStatus.Active) return "Active";
        if (status == ProjectStatus.Completed) return "Completed";
        if (status == ProjectStatus.Cancelled) return "Cancelled";
        return "Unknown";
    }

    function getPendingAmount(
        uint256 _projectId
    ) external view projectExists(_projectId) returns (uint256) {
        return pendingAmounts[_projectId];
    }

    function getProjectMilestones(
        uint256 _projectId
    ) external view projectExists(_projectId) returns (uint256[] memory) 
    { 
        uint256 count = 0; 
        for (uint256 i = 1; i <= milestoneCounter; i++) 
            if (milestones[i].projectId == _projectId) count++; 

        uint256[] memory result = new uint256[](count); 
        uint256 index = 0; 
        for (uint256 i = 1; i <= milestoneCounter; i++) 
            if (milestones[i].projectId == _projectId) 
                result[index++] = i; 

        return result; 
    }

    function getClientProjects(address _client) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= projectCounter; i++) {
            if (projects[i].client == _client) {
                count++;
            }
        }
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= projectCounter; i++) {
            if (projects[i].client == _client) {
                result[index++] = i;
            }
        }
        return result;
    }

    function getFreelancerProjects(address _freelancer) external view returns (uint256[] memory) {
        uint256 count = 0;
        // count how many projects belong to this freelancer
        for (uint256 i = 1; i <= projectCounter; i++) {
            if (projects[i].freelancer == _freelancer) {
                count++;
            }
        }
        // Allocate array exactly to the size we need
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;

        // fill the array
        for (uint256 i = 1; i <= projectCounter; i++) {
            if (projects[i].freelancer == _freelancer) {
                result[index++] = i;
            }
        }
        return result;
    }

    function getPlatformStats() external view returns (
            uint256 totalVolume,
            uint256 totalFees,
            uint256 totalProjects,
            uint256 activeProjects
        )
    {
        for (uint256 i = 1; i <= projectCounter; i++)
            if (projects[i].status == ProjectStatus.Active) activeProjects++;

        return (totalVolumeProcessed, totalFeesCollected, totalProjectsCompleted, activeProjects);
    }

    /// @notice Utility function to compare two strings.
    function compareStrings( string memory a, string memory b
    ) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    // ========== ADMIN FUNCTIONS ==========

    function updatePlatformFee(uint256 _newFeePercent) external onlyOwner {
        require(_newFeePercent <= 1000, "Fee cannot exceed 10%"); // 10% = 1000 basis points
        platformFeePercent = _newFeePercent;
    }

    function updateFreelancerFee(uint256 _newFeePercent) external onlyOwner {
        require(_newFeePercent <= 1000, "Fee cannot exceed 10%"); // 10% = 1000 basis points
        freelancerFeePercent = _newFeePercent;
    }

    function authorizeAdmin(address _admin) external onlyOwner {
        authorizedAdmins[_admin] = true;
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    function revokeAdmin(address _admin) external onlyOwner {
        authorizedAdmins[_admin] = false;
        _revokeRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    function pause() external onlyOwner {
        // Implementation for emergency pause functionality
        // This would require additional state variables and modifiers
    }

    function unpause() external onlyOwner {
        // Implementation for resuming operations after pause
    }

    // ========== EMERGENCY FUNCTIONS ==========

    function emergencyResolveDispute( uint256 _projectId, address _winner
    ) external onlyOwner projectExists(_projectId) {
        require(projects[_projectId].isDisputed, "No dispute exists");

        projects[_projectId].isDisputed = false;

        // Simple resolution - transfer entire escrow to winner
        uint256 amount = projects[_projectId].escrowBalance;
        if (amount > 0) {
            payable(_winner).transfer(amount);
            projects[_projectId].escrowBalance = 0;
        }

        projects[_projectId].status = ProjectStatus.Completed;
        emit DisputeResolved(_projectId, _winner, amount);
    }

    function emergencyWithdrawPlatformFunds() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        payable(owner()).transfer(balance);
    }

    // ========== FALLBACK & RECEIVE ==========
    receive() external payable {
        // Accept ETH deposits - could be used for direct funding
    }
    fallback() external payable {
        revert("Function not found");
    }

    // ========== MIGRATION HELPERS ==========

    function isUsingEnhancedFlow( uint256 _projectId ) external view projectExists(_projectId) returns (bool) {
        Project storage project = projects[_projectId];
        return bytes(project.metadataHash).length > 0 || project.applicationDeadline > 0;
    }

    function migrateProjectToEnhanced( uint256 _projectId, string calldata _metadataHash, uint256 _applicationDays
    ) external onlyClient(_projectId) projectExists(_projectId) {
        Project storage project = projects[_projectId];
        require(project.freelancer == address(0), "Freelancer already selected" );

        project.metadataHash = _metadataHash;
        if (_applicationDays > 0) {
            project.applicationDeadline = block.timestamp + (_applicationDays * 1 days);
            project.status = ProjectStatus.Open;
        }
    }

    // ========== TESTING HELPERS (Remove in production) ==========

    function testBackwardCompatibility() external pure returns (bool) {
        return true;
    }

    function getContractVersion() external pure returns (string memory) {
        return "CompleteFreelancePlatform v1.0.0";
    }
}

// For Better UX:

// Deploy on L2/Sidechain - Reduce gas by 95%
// Batch Transactions - Combine milestone approval + payment
// Gas Sponsorship - Platform covers gas for small projects
// Minimum Project Size - Only viable for $500+ projects on mainnet
