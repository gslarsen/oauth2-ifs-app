const express = require ('express');
const path = require('path');
const utils = require ('./utils');
require('dotenv').config();

const port=3000;

const app = express();

app.get ('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/app/index.html'));
});

// IFS combined output
app.get ('/ifs', async (req, res) => {
    try{

        // IFS calls
        const ifs_opp_users = await utils.fetch_ifs_users_for_eval(process.env.ACCESS_TOKEN);
        const ifs_opp_data = await utils.fetch_ifs_opp_data_for_eval(process.env.ACCESS_TOKEN, ifs_opp_users);
        const ifs_cust_data = await utils.fetch_ifs_cust_data_for_eval(process.env.ACCESS_TOKEN, ifs_opp_data);
        const ifs_oppline_data = await utils.fetch_ifs_oppline_data_for_eval(process.env.ACCESS_TOKEN, ifs_cust_data);
       
        // combine calls into data structure -> ref. EVAL WEB APPLICATION SOLUTION DESIGN AND TECHNICAL DESIGN SPECIFICATION v2.5 December 16, 2021
        const output = utils.combineAll(ifs_opp_users.data, ifs_cust_data.data, ifs_opp_data.data, ifs_oppline_data.data );
        console.log('\nIFS combined output:\n', output);
        res.send(output);
        
    } catch(error) {
        console.log('ERROR in /:\n', error);
    }
     
});

// authorization 
app.get ('/auth', async (req, res) => {
    try {
        res.redirect (utils.get_auth_code_url);
    } catch (error) {
        // res.sendStatus (500);
        console.log (error.message);
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

app.listen(port)