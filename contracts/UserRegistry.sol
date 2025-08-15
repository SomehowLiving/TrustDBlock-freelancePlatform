// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UserRegistry
 * @dev Handles user registration and role management for the FreelancePlatform
 */
contract UserRegistry is Ownable {
    
    // ========== STRUCTS ==========
    struct UserProfile {
        string role;
        uint256 registrationTime;
        bool isActive;
        string metadataHash; // IPFS hash for additional profile data
    }
    
    // ========== STATE VARIABLES ==========
    mapping(address => UserProfile) private userProfiles;
    mapping(string => address[]) private roleUsers; // role => list of users
    uint256 public totalRegisteredUsers;
    
    // Authorized contracts that can check user roles
    mapping(address => bool) public authorizedContracts;
    
    // ========== EVENTS ==========
    event UserRegistered(address indexed wallet, string role, uint256 timestamp);
    event UserRoleUpdated(address indexed wallet, string oldRole, string newRole);
    event UserDeactivated(address indexed wallet);
    event UserReactivated(address indexed wallet);
    event ContractAuthorized(address indexed contractAddress);
    event ContractRevoked(address indexed contractAddress);
    
    // ========== MODIFIERS ==========
    modifier validWallet(address wallet) {
        require(wallet != address(0), "Invalid wallet address");
        _;
    }
    
    modifier onlyUnregisteredUser(address wallet) {
        require(!isUserRegistered(wallet), "User already registered");
        _;
    }
    
    modifier onlyRegisteredUser(address wallet) {
        require(isUserRegistered(wallet), "User not registered");
        _;
    }
    
    modifier validRole(string memory role) {
        require(
            compareStrings(role, "Client") ||
            compareStrings(role, "Freelancer") ||
            compareStrings(role, "Admin"),
            "Invalid role"
        );
        _;
    }
    
    modifier onlyAuthorizedContract() {
        require(authorizedContracts[msg.sender] || msg.sender == owner(), "Unauthorized contract");
        _;
    }
    
    // ========== CONSTRUCTOR ==========
    constructor() Ownable(msg.sender) {}
    
    // ========== REGISTRATION FUNCTIONS ==========
    
    /**
     * @dev Register a new user with a specific role
     */
    function registerUser(
        address wallet, 
        string memory role,
        string memory metadataHash
    )
        external
        validWallet(wallet)
        onlyUnregisteredUser(wallet)
        validRole(role)
    {
        userProfiles[wallet] = UserProfile({
            role: role,
            registrationTime: block.timestamp,
            isActive: true,
            metadataHash: metadataHash
        });
        
        roleUsers[role].push(wallet);
        totalRegisteredUsers++;
        
        emit UserRegistered(wallet, role, block.timestamp);
    }
    
    /**
     * @dev Self-registration function
     */
    function selfRegister(
        string memory role,
        string memory metadataHash
    ) 
        external 
        onlyUnregisteredUser(msg.sender)
        validRole(role)
    {
        userProfiles[msg.sender] = UserProfile({
            role: role,
            registrationTime: block.timestamp,
            isActive: true,
            metadataHash: metadataHash
        });
        
        roleUsers[role].push(msg.sender);
        totalRegisteredUsers++;
        
        emit UserRegistered(msg.sender, role, block.timestamp);
    }
    
    // ========== ROLE MANAGEMENT ==========
    
    /**
     * @dev Update user role (only owner)
     */
    function updateUserRole(
        address wallet, 
        string memory newRole
    ) 
        external 
        onlyOwner
        validWallet(wallet)
        onlyRegisteredUser(wallet)
        validRole(newRole)
    {
        string memory oldRole = userProfiles[wallet].role;
        require(!compareStrings(oldRole, newRole), "Same role");
        
        // Remove from old role list
        _removeFromRoleList(wallet, oldRole);
        
        // Add to new role list
        roleUsers[newRole].push(wallet);
        userProfiles[wallet].role = newRole;
        
        emit UserRoleUpdated(wallet, oldRole, newRole);
    }
    
    /**
     * @dev Deactivate user account
     */
    function deactivateUser(address wallet) 
        external 
        onlyOwner
        validWallet(wallet)
        onlyRegisteredUser(wallet)
    {
        require(userProfiles[wallet].isActive, "User already inactive");
        userProfiles[wallet].isActive = false;
        emit UserDeactivated(wallet);
    }
    
    /**
     * @dev Reactivate user account
     */
    function reactivateUser(address wallet) 
        external 
        onlyOwner
        validWallet(wallet)
        onlyRegisteredUser(wallet)
    {
        require(!userProfiles[wallet].isActive, "User already active");
        userProfiles[wallet].isActive = true;
        emit UserReactivated(wallet);
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @dev Check if user is registered
     */
    function isUserRegistered(address wallet) public view returns (bool) {
        return userProfiles[wallet].registrationTime > 0;
    }
    
    /**
     * @dev Get user role
     */
    function getUserRole(address wallet) 
        external 
        view 
        validWallet(wallet)
        onlyAuthorizedContract
        returns (string memory) 
    {
        if (!isUserRegistered(wallet)) {
            return "Unknown";
        }
        return userProfiles[wallet].role;
    }
    
    /**
     * @dev Get user profile (public version with limited access)
     */
    function getUserProfile(address wallet) 
        external 
        view 
        validWallet(wallet)
        returns (
            string memory role,
            uint256 registrationTime,
            bool isActive,
            string memory metadataHash
        ) 
    {
        UserProfile memory profile = userProfiles[wallet];
        return (
            profile.role,
            profile.registrationTime,
            profile.isActive,
            profile.metadataHash
        );
    }
    
    /**
     * @dev Check if user has specific role and is active
     */
    function hasRole(address wallet, string memory role) 
        external 
        view 
        onlyAuthorizedContract
        returns (bool) 
    {
        if (!isUserRegistered(wallet) || !userProfiles[wallet].isActive) {
            return false;
        }
        return compareStrings(userProfiles[wallet].role, role);
    }
    
    /**
     * @dev Check if user is active
     */
    function isUserActive(address wallet) 
        external 
        view 
        onlyAuthorizedContract
        returns (bool) 
    {
        return isUserRegistered(wallet) && userProfiles[wallet].isActive;
    }
    
    /**
     * @dev Get all users with specific role
     */
    function getUsersByRole(string memory role) 
        external 
        view 
        validRole(role)
        returns (address[] memory) 
    {
        return roleUsers[role];
    }
    
    /**
     * @dev Get active users count by role
     */
    function getActiveUsersByRole(string memory role) 
        external 
        view 
        validRole(role)
        returns (address[] memory) 
    {
        address[] memory allUsers = roleUsers[role];
        address[] memory temp = new address[](allUsers.length);
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < allUsers.length; i++) {
            if (userProfiles[allUsers[i]].isActive) {
                temp[activeCount] = allUsers[i];
                activeCount++;
            }
        }
        
        // Create properly sized array
        address[] memory activeUsers = new address[](activeCount);
        for (uint256 j = 0; j < activeCount; j++) {
            activeUsers[j] = temp[j];
        }
        
        return activeUsers;
    }
    
    // ========== CONTRACT AUTHORIZATION ==========
    
    /**
     * @dev Authorize a contract to check user roles
     */
    function authorizeContract(address contractAddress) 
        external 
        onlyOwner
        validWallet(contractAddress)
    {
        authorizedContracts[contractAddress] = true;
        emit ContractAuthorized(contractAddress);
    }
    
    /**
     * @dev Revoke contract authorization
     */
    function revokeContract(address contractAddress) 
        external 
        onlyOwner
        validWallet(contractAddress)
    {
        authorizedContracts[contractAddress] = false;
        emit ContractRevoked(contractAddress);
    }
    
    // ========== INTERNAL FUNCTIONS ==========
    
    /**
     * @dev Remove user from role list
     */
    function _removeFromRoleList(address wallet, string memory role) internal {
        address[] storage users = roleUsers[role];
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == wallet) {
                users[i] = users[users.length - 1];
                users.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Utility function to compare strings
     */
    function compareStrings(string memory a, string memory b)
        internal
        pure
        returns (bool)
    {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
    
    // ========== STATS & ANALYTICS ==========
    
    /**
     * @dev Get platform user statistics
     */
    function getUserStats() 
        external 
        view 
        returns (
            uint256 totalUsers,
            uint256 totalClients,
            uint256 totalFreelancers,
            uint256 totalAdmins
        ) 
    {
        return (
            totalRegisteredUsers,
            roleUsers["Client"].length,
            roleUsers["Freelancer"].length,
            roleUsers["Admin"].length
        );
    }
}