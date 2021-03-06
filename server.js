const express = require ('express');
const path = require('path');
const utils = require ('./utils');
const bodyParser = require("body-parser");
require('dotenv').config();

const port=3000;

const app = express();
app.use(bodyParser.urlencoded({extended: false}));

app.get ('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/app/index.html'));
});

// authorization 
app.get ('/auth', async (req, res) => {
    
    if (!process.env.ACCESS_TOKEN) {
        console.log('NO ACCESS_TOKEN FOUND - GET TOKEN')
        try {
            res.redirect (utils.get_auth_code_url);
        } catch (error) {
            // res.sendStatus (500);
            console.log (error.message);
        }
    } else { // use the access_token
        res.redirect('/ifs');
    }
    
});

app.post ('/auth', async (req, res) => {
    
    process.env['OPPORTUNITY_NO'] = req.body.oppCode;

    if (!process.env.ACCESS_TOKEN) {
        console.log('NO ACCESS_TOKEN FOUND - GET TOKEN')
        try {
            res.redirect (utils.get_auth_code_url);
        } catch (error) {
            // res.sendStatus (500);
            console.log (error.message);
        }
    } else { // use the access_token
        res.redirect('/ifs');
    }
    
});

// callback for tokens
app.get ("/api/callback", async (req, res) => {
    // get auth token from req param
    const authorization_token = req.query.code;

    try {
        // get access token using authorization token
        const response = await utils.get_access_token (authorization_token);
        console.log ('\nAccess, Refresh, ID Tokens:\n', response.data);
        
        const {access_token} = response.data;
        process.env['ACCESS_TOKEN'] = response.data.access_token;
        process.env['REFRESH_TOKEN'] = response.data.refresh_token;
        process.env['ID_TOKEN'] = response.data.id_token;
        
        res.redirect('/ifs');

    } catch (error) {
        console.log('ERROR in /api/callback:\n', error);
    }
});

// IFS combined output
app.get ('/ifs', async (req, res) => {
   
    let ifs_opp_users, ifs_opp_data, ifs_cust_data, ifs_oppline_data;

    try{
        // IFS calls
        ifs_opp_users = await utils.fetch_ifs_users_for_eval(process.env.ACCESS_TOKEN);
        ifs_opp_data = await utils.fetch_ifs_opp_data_for_eval(process.env.ACCESS_TOKEN, ifs_opp_users);
        ifs_oppline_data = await utils.fetch_ifs_oppline_data_for_eval(process.env.ACCESS_TOKEN, ifs_opp_data);
        ifs_cust_data = await utils.fetch_ifs_cust_data_for_eval(process.env.ACCESS_TOKEN, ifs_opp_data);
        // console.log('\nifs_cust_data:\n', ifs_cust_data.data);
        
        // combine calls into data structure -> ref. EVAL WEB APPLICATION SOLUTION DESIGN AND TECHNICAL DESIGN SPECIFICATION v2.5 December 16, 2021
        const output = utils.combineAll(ifs_opp_users.data, ifs_cust_data.data, ifs_opp_data.data, ifs_oppline_data.data );
        console.log('\nIFS combined output:\n', output);
        res.send(output);
        
    } catch(error) {
        console.log('ERROR in /ifs:', error.response.status, error.response.config.url);
        // handle case where cust city, state query (fetch_ifs_cust_data_for_eval) returned empty
        if (error.response.status = 404) {
            const output = utils.combineAll(ifs_opp_users.data, { Name: "", City: "", State: "" }, ifs_opp_data.data, ifs_oppline_data.data );
            console.log('\nIFS combined output:\n', output);
            res.send(output);
        }
    }
     
});

app.listen(port)