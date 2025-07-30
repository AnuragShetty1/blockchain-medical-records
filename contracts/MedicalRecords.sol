// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MedicalRecords {
    // --- ERRORS ---
    error AlreadyRegistered();
    error NotRegistered();
    error NotAPatient();
    error NotAnAdmin();
    error UserNotFound();
    error NotAVerifiedDoctor();
    error AccessAlreadyGranted();
    error NoAccessToRevoke();

    // --- EVENTS ---
    event UserRegistered(address indexed userAddress, string name, Role role);
    event RecordAdded(address indexed patient, string ipfsHash, uint256 timestamp);
    event UserVerified(address indexed admin, address indexed userAddress);
    event AccessGranted(address indexed patient, address indexed doctor);
    event AccessRevoked(address indexed patient, address indexed doctor);

    // --- DATA STRUCTURES ---
    enum Role { Patient, Doctor, HospitalAdmin, InsuranceProvider, Pharmacist, Researcher, Guardian }

    struct User {
        address walletAddress;
        string name;
        Role role;
        bool isVerified;
    }

    struct Record {
        string ipfsHash;
        uint256 timestamp;
        address uploadedBy;
    }

    // --- STATE VARIABLES ---
    mapping(address => User) public users;
    mapping(address => Record[]) public patientRecords;
    mapping(address => mapping(address => bool)) public accessPermissions;

    // --- FUNCTIONS ---
    function registerUser(string memory _name, Role _role) public {
        if (users[msg.sender].walletAddress != address(0)) { revert AlreadyRegistered(); }
        users[msg.sender] = User({ walletAddress: msg.sender, name: _name, role: _role, isVerified: false });
        emit UserRegistered(msg.sender, _name, _role);
    }

    function addRecord(string memory _ipfsHash) public {
        if (users[msg.sender].walletAddress == address(0)) { revert NotRegistered(); }
        if (users[msg.sender].role != Role.Patient) { revert NotAPatient(); }
        patientRecords[msg.sender].push(Record({ ipfsHash: _ipfsHash, timestamp: block.timestamp, uploadedBy: msg.sender }));
        emit RecordAdded(msg.sender, _ipfsHash, block.timestamp);
    }

    function verifyUser(address _userToVerify) public {
        if (users[msg.sender].walletAddress == address(0)) { revert NotRegistered(); }
        if (users[msg.sender].role != Role.HospitalAdmin) { revert NotAnAdmin(); }
        if (users[_userToVerify].walletAddress == address(0)) { revert UserNotFound(); }
        users[_userToVerify].isVerified = true;
        emit UserVerified(msg.sender, _userToVerify);
    }

    function grantAccess(address _doctorAddress) public {
        if (users[msg.sender].role != Role.Patient) { revert NotAPatient(); }
        User storage doctor = users[_doctorAddress];
        if (doctor.role != Role.Doctor || !doctor.isVerified) { revert NotAVerifiedDoctor(); }
        if (accessPermissions[msg.sender][_doctorAddress]) { revert AccessAlreadyGranted(); }
        accessPermissions[msg.sender][_doctorAddress] = true;
        emit AccessGranted(msg.sender, _doctorAddress);
    }

    function revokeAccess(address _doctorAddress) public {
        if (users[msg.sender].role != Role.Patient) { revert NotAPatient(); }
        if (!accessPermissions[msg.sender][_doctorAddress]) { revert NoAccessToRevoke(); }
        accessPermissions[msg.sender][_doctorAddress] = false;
        emit AccessRevoked(msg.sender, _doctorAddress);
    }

    function getPatientRecords(address _patientAddress) public view returns (Record[] memory) {
        if (msg.sender == _patientAddress) { return patientRecords[_patientAddress]; }
        if (accessPermissions[_patientAddress][msg.sender]) { return patientRecords[_patientAddress]; }
        revert("You do not have permission to view these records.");
    }

    // --- NEW DEBUGGING GETTER FUNCTION ---
    function checkAccess(address _patientAddress, address _doctorAddress) public view returns (bool) {
        return accessPermissions[_patientAddress][_doctorAddress];
    }
}
