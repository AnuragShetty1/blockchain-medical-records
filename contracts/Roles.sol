// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./Storage.sol";

/**
 * @title Roles
 * @dev This contract manages user registration, verification, and profile updates.
 * It is a logic contract that inherits its state from the Storage contract.
 */
contract Roles is Initializable, OwnableUpgradeable, Storage {
    // --- ERRORS ---
    error AlreadyRegistered();
    error NotRegistered();
    error UserNotFound();
    error PublicKeyAlreadySet();
    error CannotRegisterAsAdmin();
    error NotSuperAdmin();
    error RequestNotFoundOrAlreadyHandled();
    error NotHospitalAdmin();
    error RoleNotAllowed();
    error UserAlreadyInHospital();
    error UserNotInHospital();
    error NotAuthorized();

    // --- EVENTS ---
    event UserRegistered(address indexed userAddress, string name, Role role);
    event UserVerified(address indexed admin, address indexed userAddress);
    event ProfileUpdated(address indexed user, string name, string contactInfo, string profileMetadataURI);
    event PublicKeySaved(address indexed user);
    event RegistrationRequested(uint256 indexed hospitalId, string name, address indexed requester);
    event HospitalVerified(uint256 indexed hospitalId, address indexed adminAddress);
    event RoleAssigned(address indexed user, Role role, uint256 indexed hospitalId);
    event RoleRevoked(address indexed user, Role role, uint256 indexed hospitalId);

    // Internal initializer to set up the parent contract.
    function __Roles_init(address initialOwner) internal onlyInitializing {
        __Ownable_init(initialOwner);
    }

    // --- FUNCTIONS ---

    /**
     * @dev Registers a new user with a specified name and role.
     * Cannot register as an Admin directly.
     */
    function registerUser(string memory _name, Role _role) public {
        if (users[msg.sender].walletAddress != address(0)) { revert AlreadyRegistered(); }
        if (_role == Role.HospitalAdmin || _role == Role.SuperAdmin) { revert CannotRegisterAsAdmin(); }

        users[msg.sender] = User({
            walletAddress: msg.sender,
            name: _name,
            role: _role,
            isVerified: false,
            publicKey: ""
        });

        userProfiles[msg.sender] = UserProfile({
            name: _name,
            contactInfo: "",
            profileMetadataURI: ""
        });

        emit UserRegistered(msg.sender, _name, _role);
    }

    /**
     * @dev Allows a user to save their public encryption key on-chain.
     */
    function savePublicKey(string memory _publicKey) public {
        if (users[msg.sender].walletAddress == address(0)) { revert NotRegistered(); }
        if (bytes(users[msg.sender].publicKey).length > 0) { revert PublicKeyAlreadySet(); }

        users[msg.sender].publicKey = _publicKey;
        emit PublicKeySaved(msg.sender);
    }

    /**
     * @dev Allows a registered user to update their profile information.
     */
    function updateUserProfile(string calldata _name, string calldata _contactInfo, string calldata _profileMetadataURI) public {
        if (users[msg.sender].walletAddress == address(0)) { revert NotRegistered(); }

        userProfiles[msg.sender].name = _name;
        userProfiles[msg.sender].contactInfo = _contactInfo;
        userProfiles[msg.sender].profileMetadataURI = _profileMetadataURI;
        users[msg.sender].name = _name;

        emit ProfileUpdated(msg.sender, _name, _contactInfo, _profileMetadataURI);
    }

    // --- Hospital Management Functions ---

    /**
     * @dev Allows anyone to request registration for a new hospital.
     */
    function requestRegistration(string memory hospitalName) public {
        uint256 id = hospitalIdCounter++;
        registrationRequests[id] = RegistrationRequest({
            hospitalId: id,
            name: hospitalName,
            requesterAddress: msg.sender,
            status: RequestStatus.Pending
        });
        emit RegistrationRequested(id, hospitalName, msg.sender);
    }

    /**
     * @dev Allows the Super Admin (owner) to verify a hospital registration request.
     */
    function verifyHospital(uint256 hospitalId, address adminAddress) public onlyOwner {
        if (registrationRequests[hospitalId].status != RequestStatus.Pending) {
            revert RequestNotFoundOrAlreadyHandled();
        }
        if (users[adminAddress].walletAddress != address(0)) { revert AlreadyRegistered(); }

        registrationRequests[hospitalId].status = RequestStatus.Approved;
        
        hospitals[hospitalId] = Hospital({
            hospitalId: hospitalId,
            name: registrationRequests[hospitalId].name,
            adminAddress: adminAddress,
            isVerified: true
        });

        users[adminAddress] = User({
            walletAddress: adminAddress,
            name: "Admin",
            role: Role.HospitalAdmin,
            isVerified: true,
            publicKey: ""
        });
        userProfiles[adminAddress] = UserProfile({ name: "Admin", contactInfo: "", profileMetadataURI: "" });
        userToHospital[adminAddress] = hospitalId;

        emit HospitalVerified(hospitalId, adminAddress);
        emit UserRegistered(adminAddress, "Admin", Role.HospitalAdmin);
    }

    /**
     * @dev Allows a Hospital Admin to assign roles within their hospital.
     */
    function assignRole(address user, Role role, uint256 hospitalId) public {
        if (users[msg.sender].role != Role.HospitalAdmin || !users[msg.sender].isVerified) { revert NotHospitalAdmin(); }
        if (userToHospital[msg.sender] != hospitalId) { revert NotAuthorized(); }
        if (role != Role.Doctor && role != Role.LabTechnician) { revert RoleNotAllowed(); }
        if (users[user].walletAddress == address(0)) { revert UserNotFound(); }
        if (userToHospital[user] != 0) { revert UserAlreadyInHospital(); }

        users[user].role = role;
        users[user].isVerified = true;
        userToHospital[user] = hospitalId;

        emit RoleAssigned(user, role, hospitalId);
        emit UserVerified(msg.sender, user);
    }

    /**
     * @dev Allows a Hospital Admin to revoke roles within their hospital.
     */
    function revokeRole(address user, Role role, uint256 hospitalId) public {
        if (users[msg.sender].role != Role.HospitalAdmin || !users[msg.sender].isVerified) { revert NotHospitalAdmin(); }
        if (userToHospital[msg.sender] != hospitalId) { revert NotAuthorized(); }
        if (users[user].walletAddress == address(0)) { revert UserNotFound(); }
        if (userToHospital[user] != hospitalId) { revert UserNotInHospital(); }

        users[user].role = Role.Patient;
        users[user].isVerified = false;
        delete userToHospital[user];

        emit RoleRevoked(user, role, hospitalId);
    }
}

 