const query_string = require ('querystring');
const axios = require("axios");
const https = require('https');
require('dotenv').config();

// Input opportunity #
const opportunityNo = "2317"; 

const auth_token_endpoint =process.env.AUTH_TOKEN_ENDPOINT;
const access_token_endpoint = process.env.ACCESS_TOKEN_ENDPOINT;

const query_params = {
    client_id: process.env.CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI
};
// passed as query params to the auth token endpoint
  const auth_token_params = {
    ...query_params,
    response_type: 'code',
  };

// passed scopes to access
const scopes = ["731104b4-f6d2-4578-8143-16e39a9f022b/.default", 'profile', 'offline_access', 'openid'];

// auth endpoint
const get_auth_code_url = `${auth_token_endpoint}?${query_string.stringify (auth_token_params)}&scope=${scopes.join (' ')}`;

// helper functions
const get_access_token = async auth_code => {

  return await axios ({
    method: 'post',
    url: `${access_token_endpoint}`,
    data: query_string.stringify({
        "grant_type": "authorization_code",
        "code": auth_code,
        "redirect_uri": process.env.REDIRECT_URI,
        "client_id": process.env.CLIENT_ID,
        "client_secret": process.env.CLIENT_SECRET 
    }),
    httpsAgent: new https.Agent({  
        rejectUnauthorized: false
    }),
    headers: {
        'Content-Type': "application/x-www-form-urlencoded",
        'User-Agent': "axios/0.26.1",
        'Accept': "*/*",
        "Cache-Control": "no-cache",
        "Host": "login.microsoftonline.com",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive"
    }
  });
};

const fetch_ifs_users_for_eval = async access_token => {

    const instance = axios.create({
    method: "get",
    baseURL:
        "https://powersecure-dev.ifs.cloud:48080/main/ifsapplications/projection/v1/",
    headers: {
            'Authorization': `Bearer ${access_token}`,
            'User-Agent': "axios/0.26.1",
            'Accept': "*/*",
            "Cache-Control": "no-cache",
            "Host": "powersecure-dev.ifs.cloud:48080",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive"
        }
    });
    
    // fetch data
    return await
    instance({
    // permission sets/roles
    url: "PermissionSetHandling.svc/Reference_AllGrantedUsers?$filter=(Role eq 'PS_DEV_ENGINEERING_MGR') and SourcePermissionSet eq 'This'",
    })

};

const fetch_ifs_opp_data_for_eval = async (access_token, response) => {

    const instance = axios.create({
    method: "get",
    baseURL:
        "https://powersecure-dev.ifs.cloud:48080/main/ifsapplications/projection/v1/",
    headers: {
            'Authorization': `Bearer ${access_token}`,
            'User-Agent': "axios/0.26.1",
            'Accept': "*/*",
            "Cache-Control": "no-cache",
            "Host": "powersecure-dev.ifs.cloud:48080",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive"
        }
    });

    // opportunity & customer data
    const opportunityConfig = {
    url: `BusinessOpportunityHandling.svc/BusinessOpportunities(OpportunityNo='${opportunityNo}')?$select=OpportunityNo,Description,CustomerId,MainRepresentativeId,Status,DateEntered,WantedDeliveryDate,MarketCode`,
    };

    return await
    instance(opportunityConfig)    

};

const fetch_ifs_cust_data_for_eval = async (access_token, response) => {

    opportunity = response.data;
    customerId = opportunity.CustomerId;

    const instance = axios.create({
    method: "get",
    baseURL:
        "https://powersecure-dev.ifs.cloud:48080/main/ifsapplications/projection/v1/",
    headers: {
            'Authorization': `Bearer ${access_token}`,
            'User-Agent': "axios/0.26.1",
            'Accept': "*/*",
            "Cache-Control": "no-cache",
            "Host": "powersecure-dev.ifs.cloud:48080",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive"
        }
    });

    return await
    instance({
        // customer address
        url: `BusinessOpportunityHandling.svc/Reference_CustomerInfoAddress(CustomerId='${customerId}',AddressId='MAIN')?$select=Name,City,State`,
    })

};

const fetch_ifs_oppline_data_for_eval = async (access_token, response) => {

    customer = response.data;

    const instance = axios.create({
    method: "get",
    baseURL:
        "https://powersecure-dev.ifs.cloud:48080/main/ifsapplications/projection/v1/",
    headers: {
            'Authorization': `Bearer ${access_token}`,
            'User-Agent': "axios/0.26.1",
            'Accept': "*/*",
            "Cache-Control": "no-cache",
            "Host": "powersecure-dev.ifs.cloud:48080",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive"
        }
    });

    return await
    instance({
        // opportunity line items
        url: `BusinessOpportunityHandling.svc/BusinessOpportunityLines?$filter=OpportunityNo eq '${opportunityNo}'&$select=OpportunityNo,CustomerName,CustomerId,OpportunityDescription,DateEntered,Cf_Bol_Main_Rep,Status,WantedDeliveryDate,LineNo,Description,ConObjectType,ConObjectRef1`,
    })

};

/*  COMBINE SOURCES */
const combineAll = (roles, customer, opportunity, opportunityLines) => {

    // if customer name in customer is null, replace with customer name in opportunityLines
    if (!customer.Name) customer.Name = opportunityLines.value[0].CustomerName;

    const authorizedUsers = [];

    // simplify roles array
    for (let i = 0; i < roles.value.length; ++i) {
        authorizedUsers.push(roles.value[i].Identity);
    }

    // collect opportunity lines
    const oppLines = [];

    // per Dan Gardner on 3/3/22 weekly status call, only take the first opp line (1 proj : 1 opp : 1 opp line); 
    for (let i = 0; i < 1; ++i) {
        oppLines.push({
        referenceType: opportunityLines.value[i].ConObjectType,
        projectId: opportunityLines.value[i].ConObjectRef1,
        revisionNo: opportunityLines.value[i].RevisionNo,
        lineNo: opportunityLines.value[i].LineNo,
        description: opportunityLines.value[i].Description,
        dateEntered: opportunityLines.value[i].DateEntered,
        wantedDeliveryDate: opportunityLines.value[i].WantedDeliveryDate,
        status: opportunityLines.value[i].Status,
        customerName: opportunityLines.value[i].CustomerName,
        customerId: opportunityLines.value[i].CustomerId,
        mainRep: opportunityLines.value[i].Cf_Bol_Main_Rep,
        });
    }

    // combine into one object
    const combined = {
        businessOpportunityNumber: opportunity.OpportunityNo
        ? opportunity.OpportunityNo
        : null,
        businessName: customer.Name,
        businessOpportunityName: opportunity.Description
        ? opportunity.Description
        : null,
        businessOpportunityCity: customer.City,
        businessOpportunityState: customer.State,
        businessOpportunityCreatedDate: opportunity.DateEntered
        ? opportunity.DateEntered
        : null,
        businessOpportunityCreatedBy: opportunity.MainRepresentativeId
        ? opportunity.MainRepresentativeId
        : null,
        businessOpportunityStatus: opportunity.Status,
        businessOpportunityEstimateDueDate: opportunity.WantedDeliveryDate,
        verticalMarket: opportunity.MarketCode,
        businessOpportunityLineItems: oppLines,
        authorizedUsers,
    };

    return combined;
};

module.exports ={get_auth_code_url, get_access_token, fetch_ifs_users_for_eval, fetch_ifs_opp_data_for_eval, fetch_ifs_cust_data_for_eval, fetch_ifs_oppline_data_for_eval, combineAll}