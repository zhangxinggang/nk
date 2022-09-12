var pem = require("pem");
var hellman = require("./hellman.js");
pem.createCSR(
  {
    country: "CN",
    state: "SHANXI",
    locality: "XIAN",
    organization: "",
    organizationUnit: "",
    commonName: "",
    altNames: [],
    emailAddress: "",
    clientKey: hellman.private_pkcs1,
    // clientKeyPassword:''
  },
  function (err, data) {
    if (err) {
      console.log(err);
      return;
    }
    pem.createCertificate(
      {
        days: 365 * 100,
        serviceKey: hellman.private_pkcs1,
        selfSigned: false,
        csr: data.csr,
      },
      function (err, data) {
        if (err) {
          console.log(err);
          return;
        }
        console.log(data);
      }
    );
  }
);
