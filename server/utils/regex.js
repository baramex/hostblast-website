const passwordRegex = /^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{6,32}$)/;
const nameRegex = /^[a-z]{2,32}$/i;
const permissionRegex = /^([A-Z]*){1, 32}$/;

module.exports = { passwordRegex, nameRegex, permissionRegex };