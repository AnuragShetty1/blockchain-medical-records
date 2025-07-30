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
    error NotAnInsuranceProvider();
    error RequestNotFound();
    error NotAuthorized();

    // --- EVENTS ---
    event UserRegistered(address indexed userAddress, string name, Role role);
    event RecordAdded(address indexed patient, string ipfsHash, uint256 timestamp);
    event UserVerified(address indexed admin, address indexed userAddress);
    event AccessGranted(address indexed patient, address indexed doctor);
    event AccessRevoked(address indexed patient, address indexed doctor);
    event AccessRequested(uint256 indexed requestId, address indexed patient, address indexed provider, string claimId);
    event RequestApproved(uint256 indexed requestId, address indexed patient);
    event RequestArrayUpdated(address indexed patient, uint256 newLength);

    // --- DATA STRUCTURES ---
    enum Role { Patient, Doctor, HospitalAdmin, InsuranceProvider, Pharmacist, Researcher, Guardian }
    enum RequestStatus { Pending, Approved, Rejected }

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

    struct AccessRequest {
        uint256 id;
        address patient;
        address provider;
        string claimId;
        RequestStatus status;
    }

    // --- STATE VARIABLES ---
    mapping(address => User) public users;
    mapping(address => Record[]) public patientRecords;
    mapping(address => mapping(address => bool)) public accessPermissions;
    mapping(address => AccessRequest[]) public patientRequests;
    uint256 private _nextRequestId;

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

    function requestAccess(address _patientAddress, string memory _claimId) public {
       if (users[msg.sender].role != Role.InsuranceProvider) { revert NotAnInsuranceProvider(); }
       if (users[_patientAddress].role != Role.Patient) { revert NotAPatient(); }
       uint256 requestId = _nextRequestId++;
       patientRequests[_patientAddress].push(AccessRequest({
           id: requestId,
           patient: _patientAddress,
           provider: msg.sender,
           claimId: _claimId,
           status: RequestStatus.Pending
       }));
       emit AccessRequested(requestId, _patientAddress, msg.sender, _claimId);
       emit RequestArrayUpdated(_patientAddress, patientRequests[_patientAddress].length);
   }

   function approveRequest(uint256 _requestId) public {
       if (users[msg.sender].role != Role.Patient) { revert NotAPatient(); }
       AccessRequest[] storage requests = patientRequests[msg.sender];
       bool found = false;
       for (uint i = 0; i < requests.length; i++) {
           if (requests[i].id == _requestId && requests[i].status == RequestStatus.Pending) {
               requests[i].status = RequestStatus.Approved;
               accessPermissions[msg.sender][requests[i].provider] = true;
               found = true;
               emit RequestApproved(_requestId, msg.sender);
               break;
           }
       }
       if (!found) { revert RequestNotFound(); }
   }

    function getPatientRecords(address _patientAddress) public view returns (Record[] memory) {
        if (msg.sender == _patientAddress) { return patientRecords[_patientAddress]; }
        if (accessPermissions[_patientAddress][msg.sender]) { return patientRecords[_patientAddress]; }
        revert("You do not have permission to view these records.");
    }

    function checkAccess(address _patientAddress, address _doctorAddress) public view returns (bool) {
        return accessPermissions[_patientAddress][_doctorAddress];
    }

    // --- REPLACED getPatientRequests with these two new functions ---
    function getPatientRequestsCount(address _patientAddress) public view returns (uint256) {
        if (msg.sender != _patientAddress) { revert NotAuthorized(); }
        return patientRequests[_patientAddress].length;
    }

    function getPatientRequestAtIndex(address _patientAddress, uint256 _index) public view returns (AccessRequest memory) {
        if (msg.sender != _patientAddress) { revert NotAuthorized(); }
        return patientRequests[_patientAddress][_index];
    }
}
