'use strict';

const Twit = require('twit');
const GCLang = require('@google-cloud/language');
const twitter_creds = require('./tw_creds.json');

var T = new Twit({
    consumer_key:         twitter_creds.consumer_key,
    consumer_secret:      twitter_creds.consumer_secret,
    access_token:         twitter_creds.access_token,
    access_token_secret:  twitter_creds.access_token_secret,
    timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
});

const GCLangClient = new GCLang.LanguageServiceClient({keyFilename: './GCP_keyfile.json'});

function doTwitterSearch(){
    T.get('search/tweets', { q: '#googleio', count: 10 })
        .catch(err => console.log(err))
        .then(processTweets)
        .then(analyzeTweets)
        .then(printResults)
        .catch(err => console.log(err));
}

function processTweets(result){
    console.log("Start processTweets");

    //console.log(JSON.stringify(result, null, 2))
    var tweets = [];
    result.data.statuses.forEach(element => {
        var tweet = element.text;
        //console.log("ORIG: " + tweet);
        tweet = tweet.replace(/RT/g, '');
        tweet = tweet.replace(/#/g, '');
        tweet = tweet.replace(/\r?\n|\r/g, '. ');
        tweet = tweet.replace(/(https?:\/\/[^\s]+)/g, '');
        //console.log("REPL: " + tweet);
        //console.log("--------------------------------");
        tweets.push(tweet);
    });

    console.log("End processTweets");
    return tweets;
}

function analyzeTweets(tweets){
    console.log("Start analyzeTweets");
    
    var allTweets = "";
    tweets.forEach(tweet => allTweets += (tweet + "\n"));

    console.log(`Tweets: ${allTweets}`);

    const document = {
        content: allTweets,
        type: 'PLAIN_TEXT',
    };
    
    return GCLangClient.annotateText({document: document, features: {extractDocumentSentiment: true, classifyText: true}})
        .then(results => {
            const sentiment = results[0].documentSentiment;
            var sentScore = sentiment.score;
            var sentMagn = sentiment.magnitude;

            var categ = results[0].categories[0].name;

            return{
                score: sentScore,
                magnitude: sentMagn,
                classification: categ.replace('/', '').replace('/', ', specifically ')
            };
        })
        .catch(err => {
            console.error('ERROR:', err);
        });

    console.log("End analyzeTweets");
}

function printResults(result){
    console.log("Start printResults");

    var sentiment = 'unknown';
    if(result.score < -0.5){
        sentiment = 'terrible';
    }
    else if(result.score >= -0.5 && result.score < -0.3){
        sentiment = 'very negative';
    }
    else if(result.score >= -0.3 && result.score < 0.0){
        sentiment = 'pretty negative';
    }
    else if(result.score >= 0.0 && result.score < 0.5){
        sentiment = 'pretty positive';
    }
    else{
        sentiment = 'very positive';
    }

    var confidence = 'unknown';
    if(result.magnitude < 0.3){
        confidence = 'low';
    }
    else if(result.magnitude >= 0.3 && result.magnitude < 1.0){
        confidence = 'medium';
    }
    else{
        confidence = 'high';
    }

    console.log(`The analyzed tweets talk mostly about ${result.classification}`);
    console.log(`They are ${sentiment} with a ${confidence} confidence.\n`);

    console.log("Finish printResults");
}

doTwitterSearch();
