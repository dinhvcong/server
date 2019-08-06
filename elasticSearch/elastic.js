const elasticsearch = require('elasticsearch');
const client = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'trace'
});

//const controller = require('../method/controller')
const WitApi = require("../method/index");
const method = require("../method/convert");

client.ping({ requestTimeout: 30000 }, (error) => {
    if (error) {
        console.error('elasticsearch cluster is down!');
    }
    else {
        console.log('Everything is ok');
    }
});

module.exports = {
     async checkExistIndices(index) {
        return await client.indices.exists({ index: index });
    },

    //create indices
    async createIndices(index) {
        await client.indices.create({
            index: index,
            include_type_name: true,
            body: {
                "mappings": {
                    "mytype": {
                        "properties": {
                            "id": {
                                "type": 'text'
                            },
                            "entities": {
                                "type": 'object'
                            },
                            "params": {
                                "type": 'keyword'
                            },
                            "intent": {
                                "type": 'keyword'
                            },
                            "question": {
                                "type": 'text'
                            },
                            "default_answer": {
                                "type": 'text'
                            },
                            "answer": {
                                "type": 'text'
                            }
                        }
                    }
                }
            }
        }, err => {
            if (err) console.log(err)
            else console.log("Indices Created");
        })
    },

    createIndex_(data, ID) {
        // console.log(data);
         return client.index({
             index: 'myindex',
             type: 'mytype',
             id: ID,
             body: JSON.stringify(data),  
         })
             .then((result) => {
                 return true;
             })
             .catch(() => {
                 return false;
             })
     },

    async elasticSearch(intent, params){
        return await client.search({
            index: 'myindex',
            type: 'mytype',
            body: {
              "query": {
                  "bool": {
                    "must":[
                        { "match": { "intent": intent } },
                        { "match": { "params": params } }
                    ],
                  }
              },
            }
        })
        .then(result => result.hits.hits)
        .catch(err => console.log("ERROR " + err));
    },

    async elasticSearchID(ID){
        return await client.search({
            index: 'myindex',
            type: 'mytype',
            body:{
                    "query" : {
                      "match":{
                         "_id": ID
                      }
                    }
            }
        })
        .then(result => result.hits.hits)
        .catch(err => console.log("ERROR " + err));
    },

    
    match_all(){
        return client.search({
            index: 'myindex',
            type: 'mytype',
            size: 100,
            body:{
            "query":{"match_all":{}}
            }
        }).then(result=>result.hits.hits)
    },

    async elasticDeleteQuestion(ID){
        return await client.delete({
            index: 'myindex',
            type: 'mytype',
            id: ID,
          })
            .then(err => console.log("OK"))
            .catch(err => console.log("ERROR " + err));
    },

    async elasticDeleteIntent(intent){
        return await client.search({
            index: 'myindex',
            type: 'mytype',
            body: {
              "query": {
                  "bool": {
                    "must":[
                        { "match": { "intent": intent } }
                    ],
                  }
              },
            }
        })
        .then(result => result.hits.hits)
        .catch(err => console.log("ERROR " + err));
    },

    async elasticDeleteEnity(params){
        return await client.search({
            index: 'myindex',
            type: 'mytype',
            body: {
              "query": {
                  "bool": {
                    "must":[
                        { "match": { "params": params } }
                    ],
                  }
              },
            }
        })
        .then(result => result.hits.hits)
        .catch(err => console.log("ERROR " + err));
    },
    
}