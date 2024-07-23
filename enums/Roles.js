const Roles = {
  Admin: 'Admin', // Can do anything
  Broker: 'Broker', // Can access Accidents , policies
  CallCenter: 'CallCenter', // Can access Users, Cars, SR, Pkgs, PC
  Client: 'Client',
  Corporate: 'Corporate',
  Driver: 'Driver',
  Inspector: 'Inspector', // Can access Accidents , policies
  Insurance: 'Insurance', // Can access Accidents , policies
  Manager: 'Manager', // Can access Accidents , policies
  Super: 'Super', // Can do anything
  Supervisor: 'Supervisor', // Can access Accidents , policies, insurance CRU
};

module.exports = Roles;
