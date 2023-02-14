/* eslint-disable no-useless-escape */
const EMAIL_REGEX = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^])[A-Za-z\d@$!%*?&^]{8,}$/;

export const isEmailValid = (email) => {
  return EMAIL_REGEX.test(email);
}

export const isPasswordValid = (password) => {
  return PASSWORD_REGEX.test(password);
}

export const mergeDeep = (...objects) => {
  const isObject = obj => obj && typeof obj === 'object';

  return objects.reduce((prev, obj) => {
    Object.keys(obj).forEach((key) => {
      const pVal = prev[key];
      const oVal = obj[key];

      if (Array.isArray(pVal) && Array.isArray(oVal)) {
        prev[key] = pVal.concat(...oVal); // eslint-disable-line
      } else if (isObject(pVal) && isObject(oVal)) {
        prev[key] = mergeDeep(pVal, oVal); // eslint-disable-line
      } else {
        prev[key] = oVal; // eslint-disable-line
      }
    });

    return prev;
  }, {});
};

export const isEmpty = data => !data || data.length === 0;

export const randomInteger = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

export const arraySum = (data = []) => {
  return data.reduce((prev, acc) => acc + prev, 0);
};

// export default {
//   isEmailValid,
//   isPasswordValid,
//   mergeDeep,
//   isEmpty,
//   randomInteger,
//   arraySum
// };