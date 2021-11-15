const ex = require("express")
const app = ex();
var path = require("path");
const bodyParser = require("body-parser");
const handle = require("express-handlebars");
const Sequelize = require("sequelize");
const multer = require("multer");
const { count } = require("console");
const _dirname = path.resolve();
app.use("/static", ex.static(path.join(__dirname + '/static')));

app.use(bodyParser.urlencoded({extended: true, layoutsDir: path.join(__dirname, "views")}));
app.use(bodyParser.json());
app.engine(".hbs",handle({extname:".hbs", helpers: {
  //This helper is used to format the lightning bolt icons used to indicate performance of a package.
  performance: function(rating, options){
    var perf = "<li>";
    perf = perf + "Performance: ";

    for (let i = 0; i < rating; i++) {
      perf = perf + '<i class="bi bi-lightning-charge-fill"></i>';
    }
    perf = perf + "</li>"
    return perf;
  },
  json: function(context) {
    return JSON.stringify(context);
  }
}

}));

app.set("view engine",".hbs");
const storage = multer.diskStorage({
  destination: "./public/photos/",
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});


const upload = multer({ storage: storage });

//Sequelize Init
var sequelize = new Sequelize('ddhi1f5o6k0hc8', 'kqwbqnwglyvqto', '68c2ec21e4bc4b2ae52f888b50b19cf87f5f5d47624fc49148115321fc75b1f8', {
  host: 'ec2-35-169-204-98.compute-1.amazonaws.com',
  dialect: 'postgres',
  port: 5432,
  dialectOptions: {
      ssl: { rejectUnauthorized: false }
  },
  query: { raw: true }
});

sequelize
  .authenticate()
  .then(function() {
      console.log('Connection has been established successfully.');
  })
  .catch(function(err) {
      console.log('Unable to connect to the database:', err);
  });


//User Account
  var User = sequelize.define('users', {
    email:  {
        type: Sequelize.STRING,
        primaryKey: true
      },
    password: Sequelize.STRING,
    name: Sequelize.STRING,
    lastname: Sequelize.STRING,
    phonenum: Sequelize.STRING,
    address1: Sequelize.STRING,
    address2: Sequelize.STRING,
    city: Sequelize.STRING,
    province: Sequelize.STRING,
    postalcode: Sequelize.STRING,
    user_type: Sequelize.STRING
},{
  createdAt: false, // disable createdAt
  updatedAt: false, // disable updatedAt
  id: false
});

//Hosting Plans
var Plan = sequelize.define('plans', {
  planID:  {
    type: Sequelize.INTEGER,
    primaryKey: true
  },
  plan_name: Sequelize.STRING,
  plan_description: Sequelize.STRING,
  plan_cost: Sequelize.FLOAT,
  plan_performance: Sequelize.INTEGER,
  plan_websites: Sequelize.STRING,
  site_traffic: Sequelize.STRING,
  email_type: Sequelize.STRING,
  site_migration: Sequelize.STRING,
  plan_domain: Sequelize.STRING,
  features_type: Sequelize.STRING,
  email_contacts: Sequelize.INTEGER,
  plan_ssl: Sequelize.STRING,
  ip_type: Sequelize.STRING,
  icon: Sequelize.BLOB,
  most_popular: Sequelize.INTEGER
},{
  createdAt: false, // disable createdAt
  updatedAt: false, // disable updatedAt
  id: false
});





//***********************************/
//template rendering

/*app.get("/", function(req, res){
    res.sendFile(path.join(_dirname,"/home.html"));
});*/

//Dashboard
app.get("/", function(req, res){

  Dashboard(0, res);
  //res.render("dashboard", {layout: false})
});

//Gets the most popular plan, then renders the dashboard
function Dashboard(userInfo = 0, res){
  sequelize.sync().then(function (){ 
    Plan.findOne({
      where: {most_popular: 1}
    }).then(function(data){

      if (userInfo) {
        res.render("dashboard", {data1: userInfo, mostPopular: data, layout: false})
      } else {
        res.render("dashboard", {mostPopular: data, layout: false})
      }

    });
  });

}

//Admin Plan Functions

//Sets a specified plan to be displayed on the dashboard.
function setMostPopular(newPlanID){
  console.log(newPlanID)
  sequelize.sync().then(function (){ 
    //Unset the current most popular plan.
    Plan.update({most_popular: 0},{
      where: {most_popular: 1}
    })

    //Set the passed plan parameter to most popular
    Plan.update({most_popular: 1},{
      where: {planID: newPlanID} 
      
    })
  });
}
function addPlan(np){
  console.log(np)
   Plan.count({})
  .then(function(count) {
    Plan.create({
      planID: count + 1,
      plan_name: np.name,
      plan_description: np.desc,
      plan_cost: np.price,
      plan_performance: np.perf,
      plan_websites: np.sites,
      site_traffic: "Unlimited",
      email_type: np.email,
      site_migration: np.migration,
      plan_domain: np.domain,
      features_type: "Premium",
      email_contacts: np.contacts,
      plan_ssl: np.ssl,
      ip_type: np.ip,
      icon: np.photo,
      most_popular: 0
    }).then(function(){ console.log("Plan Created!")});
  }); 
}
app.post("/addPlan_post", upload.single("photo"),  function(req, res){
  let np = req.body;
  console.log(np)
  addPlan(np);
 
  res.redirect("/plans");
});


//Web hosting plans.
app.get("/plans", function(req, res){
  sequelize.sync().then(function (){ 
    Plan.findAll().then(function(data){
    res.render("cwh", {plans: data, layout: false})
    });
  });
});

//Administrator version
app.get("/plans_admin", function(req, res){
  sequelize.sync().then(function (){ 
    Plan.findAll().then(function(data){
    res.render("cwh_admin", {plans: data, layout: false})
    });
  });
});

app.get("/addPlan", function(req, res){

    res.render("addPlan", {layout: false})

});

app.post("/setPlan_post", function(req, res){

  setMostPopular(req.body.nmp_plan_id)
  Dashboard(0, res)

});

//***********************************/
//login form
app.get("/login", function(req, res){
  res.render("login", {layout: false})
});

app.post("/login_post", function(req, res){
  let form = req.body;
  let username = form.username_field;
  var errorMsg = {userErr: "", passErr: ""};

  //Regex to check for special characters.
  let special = /[!#$%^&*()_+\-=\[\]{};':"\\|,<>\/?]+/;
  
  //if the username contains invalid characters, 
  //reload the login page with this message.
  if(special.test(username)){
    errorMsg.userErr = "Username contains invalid characters!";
    res.render("login", {error: errorMsg , layout: false})

  }else {
    sequelize.sync().then(function (){ 
      User.findOne({
        attributes: ['email', 'password', 'name', 'lastname', 'user_type'],
        where: {
            email: username
        }
      }).then(function(data){
        if (form.password_field === data.password) {
          console.log(data.user_type)
          if (data.user_type === "admin") {
            res.render("dashboard_admin", {data1: data, layout: false})
          } else {
            Dashboard(data,res)
          }
          
        } else {          
          errorMsg.passErr = "Invalid Email/Password!"
          res.render("login", {error: errorMsg , layout: false})
        }
      })

    });
  }
});

//Registration Functions
function createUser(form){

  sequelize.sync().then(function () {

    User.create({
      email: form.email,
      password: form.password,
      name: form.fname,
      lastname: form.surname,
      phonenum: form.phone_num,
      address1: form.address1,
      address2: form.address2,
      city: form.city,
      province: form.state,
      postalcode: form.zip,
      user_type: 'User'
    }).then(function(){ console.log("User Created!")});

  })
}


//check if any fields are NULL/empty
function validateRegistration(form){
  let validUser = false;
  let errors = 0;
  //object that holds error messages to display.
  var errMsg = {nameErr: "", lnameErr: "", emailErr: "", phoneErr: "", passErr: "", addressErr: "", cityErr: "", stateErr: "", zipErr: ""};

  if (form.fname == "") {
    errMsg.nameErr = "Missing Name!";
    errors++;
  }
  if (form.lname == "") {
    errMsg.lnameErr = "Missing Last Name!";
    errors++;
  }
  if (form.email == "") {
    errMsg.emailErr = "Missing Email!";
    errors++;
  }
  if (form.phone_num == "") {
    errMsg.phoneErr = "Missing Phone Number!";
    errors++;
  }
  if (form.password == "") {
    errMsg.passErr = "Password Cannot Be Empty!";
    errors++;
  }
  if (form.address1 == "") {
    errMsg.addressErr = "Missing Address!";
    errors++;
  }
  if (form.city == "") {
    errMsg.cityErr = "Missing City!";
    errors++;
  }
  if (form.state == "") {
    errMsg.stateErr = "Please Select A Province";
    errors++;
  }
  if (form.zip == "") {
    errMsg.zipErr = "Missing Postal Code!";
    errors++;
  }


  if (errors > 0) {
    res.render("registration",{error: errMsg, layout: false});
  } else {
    validUser = true;
  }
  return validUser;
};

//***********************************/
//register form
app.get("/register", function(req, res){
  res.render("registration",{layout: false})
});
app.post("/register_post", function(req, res){
  let form = req.body;

  let validForm = validateRegistration(form);
  let name = form.fname;
  let email = form.email;
  let phone = form.phone_num;
  let password = form.password;
  let confirm = form.password_confirm;

  //regular expression for email
  let email_validator = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  var email_isvalid = email_validator.test(email);

  //regular expression for phone number
  let phone_validator = /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/;
  var phone_isvalid = phone_validator.test(phone);

  
  //checks if both passwords exactly match
  let passwords_match = (confirm === password);

  //Error messages to send back to the registration form
  let errorMsg = {emailErr: "", phoneErr: "", passErr: ""};


  //Checks if password is long enough
  if(6 <= password.length && password.length <= 12 ){
    password_islong = true
  }else password_islong = false;
  //checks if password has both uppercase and lowercase characters.
  var hasUpperCase = /[A-Z]/.test(password);
  var hasLowerCase = /[a-z]/.test(password);
  
  //Checks if Email and phone number are properly formatted. 
  if (email_isvalid == 0) {
    console.log("Invalid Email");
    errorMsg.emailErr = "Invalid Email Address!";
  } 
  if(phone_isvalid ==0){
    console.log("Invalid Phone");
    errorMsg.phoneErr = "Invalid Phone Number!";
  }

  //Check if both passwords match, and is strong enough
  if(password_islong == 0 || hasUpperCase == 0 || hasLowerCase == 0){
    console.log("Password is weak");
    errorMsg.passErr = "Password Must be 6 to 12 characters long, and contain upper and lowercase letters";
  }
  if(passwords_match == 0){
    console.log("Password doesn't match");
    errorMsg.passErr = "Passwords Do not Match!";
  }

  if (email_isvalid + phone_isvalid + password_islong + hasLowerCase + hasUpperCase + passwords_match + validForm == 7) {
    {
      createUser(form);
      sequelize.sync().then(function (){ 
        User.findOne({
          attributes: ['email', 'password', 'name', 'lastname'],
          where: {
              email: username
          }
        }).then(function(data){
        Dashboard(form, res)
      });
    });
  }
  }else {
  res.render("registration",{error: errorMsg, layout: false});
  }
});

app.use((req, res) => {
    res.status(404).send("Page Not Found");
  });

const port = process.env.PORT || 8080;
app.listen(port);
