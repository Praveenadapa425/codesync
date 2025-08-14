// // js/amplify_config.js
// window.amplifyConfig = {
//   Auth: {
//     region: "us-east-1",
//     userPoolId: "us-east-1_RMhlKuGHS",
//     userPoolWebClientId: "4g0bo9ac68vq4g817v1je4e5sf",
//     authenticationFlowType: "USER_PASSWORD_AUTH"
//   }
// };


window.amplifyConfig = {
  Auth: {
    region: "us-east-1",
    userPoolId: "us-east-1_RMhlKuGHS",
    userPoolWebClientId: "4g0bo9ac68vq4g817v1je4e5sf",
    authenticationFlowType: "USER_PASSWORD_AUTH",
    storage: window.localStorage  // ✅ this is the fix!
  }
};
