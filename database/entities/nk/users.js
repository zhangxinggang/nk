//https://blog.csdn.net/weixin_34341229/article/details/88063097
module.exports = {
  name: "users",
  columns: {
    OID: {
      primary: true,
      type: Number,
      generated: true,
    },
    PositionOID: {
      type: Number,
      nullable: true,
    },
    LoginCount: {
      type: Number,
      default: 1,
    },
    RoleOID: {
      type: Number,
      nullable: true,
    },
    AID: {
      length: 64,
      type: String,
      unique: true,
      readonly: true, //是否只读，如果是那么只能在insert中赋值，更新不能改变!
    },
    Password: {
      length: 1000,
      type: String,
    },
    Name: {
      length: 255,
      type: String,
    },
    QQ: {
      length: 20,
      type: String,
      nullable: true,
    },
    MobilePhone: {
      length: 50,
      type: String,
      nullable: true,
    },
    EMail: {
      length: 255,
      type: String,
      nullable: true,
    },
    WeChat: {
      length: 50,
      type: String,
      nullable: true,
    },
    HeadPortrait: {
      type: "text",
      // default:'/assets/img/default/headPortrait/avatar2.png'
    },
    Status: {
      type: Number,
      default: 1,
      comment: "1：正常，2：已删除",
    },
    Signature: {
      type: String,
      length: 255,
      nullable: true,
    },
    Birthday: {
      type: Date,
      nullable: true,
    },
    CreateTime: {
      type: Date,
      readonly: true,
      // onUpdate:'CURRENT_TIMESTAMP' 只支持mysql
    },
    LastLoginTime: {
      type: "timestamp",
      // precision:2,
    },
  },
  // relations:{
  //     ur:{
  //         target:"roles",
  //         type:"many-to-many",
  //         joinTable:true,
  //         cascade:true
  //     }
  // }
  // orderBy:{
  //     OID:{
  //         order:"ASC" | "DESC",
  //         nulls:"NULLS FIRST" | "NULLS LAST"
  //     }
  // },
  // engine:"InnoDB" || "MyISAM",
  // database:'test'
};
