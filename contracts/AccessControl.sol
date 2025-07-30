// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Roles.sol";

abstract contract AccessControl is Roles {
    // --- ERRORS ---
    error NotAPatient();
    error NotAVerifiedDoctor();
    error AccessAlreadyGranted();
    error NoAccessToRevoke();
    error NotAnInsuranceProvider();
    error RequestNotFound();
    error NotAuthorized();

    // --- EVENTS ---
    event AccessGranted(address indexed patient, address indexed doctor);
    event AccessRevoked(address indexed patient, address indexed doctor);
    event AccessRequested(uint256 indexed requestId, address indexed patient, address indexed provider, string claimId);
    event RequestApproved(uint256 indexed requestId, address indexed patient, uint256 accessDuration);

    // --- DATA STRUCTURES ---
    enum RequestStatus { Pending, Approved, Rejected }

    struct AccessRequest {
        uint256 id;
        address patient;
        address provider;
        string claimId;
        RequestStatus status;
    }

    // --- STATE VARIABLES ---
    mapping(address => mapping(address => uint256)) public accessPermissions;
    mapping(address => AccessRequest[]) public patientRequests;
    uint256 private _nextRequestId;

    // --- NEW STATE VARIABLES FOR EFFICIENT LOOKUP ---
    mapping(address => address[]) private _grantedAccessList;
    mapping(address => mapping(address => uint256)) private _grantedAccessIndex;

    // --- FUNCTIONS ---
    function grantAccess(address _doctorAddress) public {
        if (users[msg.sender].role != Role.Patient) { revert NotAPatient(); }
        User storage doctor = users[_doctorAddress];
        if (doctor.role != Role.Doctor || !doctor.isVerified) { revert NotAVerifiedDoctor(); }
        if (accessPermissions[msg.sender][_doctorAddress] > block.timestamp) { revert AccessAlreadyGranted(); }

        accessPermissions[msg.sender][_doctorAddress] = type(uint256).max;
        _grantedAccessList[msg.sender].push(_doctorAddress);
        _grantedAccessIndex[msg.sender][_doctorAddress] = _grantedAccessList[msg.sender].length;

        emit AccessGranted(msg.sender, _doctorAddress);
    }

    function revokeAccess(address _userAddress) public {
        if (users[msg.sender].role != Role.Patient) { revert NotAPatient(); }
        if (accessPermissions[msg.sender][_userAddress] < block.timestamp) { revert NoAccessToRevoke(); }

        accessPermissions[msg.sender][_userAddress] = 0;

        // Efficiently remove from the array
        uint256 indexToRemove = _grantedAccessIndex[msg.sender][_userAddress] - 1;
        address lastAddress = _grantedAccessList[msg.sender][_grantedAccessList[msg.sender].length - 1];
        _grantedAccessList[msg.sender][indexToRemove] = lastAddress;
        _grantedAccessIndex[msg.sender][lastAddress] = indexToRemove + 1;
        _grantedAccessList[msg.sender].pop();
        delete _grantedAccessIndex[msg.sender][_userAddress];

        emit AccessRevoked(msg.sender, _userAddress);
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
    }

    function approveRequest(uint256 _requestId, uint256 _durationInDays) public {
       if (users[msg.sender].role != Role.Patient) { revert NotAPatient(); }
       AccessRequest[] storage requests = patientRequests[msg.sender];
       bool found = false;
       for (uint i = 0; i < requests.length; i++) {
           if (requests[i].id == _requestId && requests[i].status == RequestStatus.Pending) {
               requests[i].status = RequestStatus.Approved;
               uint256 expirationTime = block.timestamp + (_durationInDays * 1 days);
               address provider = requests[i].provider;

               accessPermissions[msg.sender][provider] = expirationTime;
               _grantedAccessList[msg.sender].push(provider);
               _grantedAccessIndex[msg.sender][provider] = _grantedAccessList[msg.sender].length;

               found = true;
               emit RequestApproved(_requestId, msg.sender, _durationInDays);
               break;
           }
       }
       if (!found) { revert RequestNotFound(); }
    }

    function checkAccess(address _patientAddress, address _doctorAddress) public view returns (bool) {
        return accessPermissions[_patientAddress][_doctorAddress] > block.timestamp;
    }

    function getPatientRequestsCount(address _patientAddress) public view returns (uint256) {
        if (msg.sender != _patientAddress) { revert NotAuthorized(); }
        return patientRequests[_patientAddress].length;
    }

    function getPatientRequestAtIndex(address _patientAddress, uint256 _index) public view returns (AccessRequest memory) {
        if (msg.sender != _patientAddress) { revert NotAuthorized(); }
        return patientRequests[_patientAddress][_index];
    }

    // --- NEW GETTER FOR ACCESS LIST ---
    function getAccessList(address _patientAddress) public view returns (address[] memory) {
        if (msg.sender != _patientAddress) { revert NotAuthorized(); }
        return _grantedAccessList[_patientAddress];
    }
}