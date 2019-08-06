const WitApi = require("../method/index");
const queryDb = require("../method/queryDB");
const method = require("../method/convert");
const elastic = require('../elasticSearch/elastic')
const md5 = require('md5');
module.exports = {
    async createTable(index){
        let a= await elastic.checkExistIndices(index);
       // console.log(a);
        if(a==false){
            elastic.createIndices(index);
        }
    },

    createIndex(data, ID) {
        return elastic.createIndex_(data, ID)   
    },
   
    async elasticDetectID(question){
        let intent='';
        let objEntity={};
        let Answer = '';
        let defaultAnswer='';
        let ID = md5(question)
        let ans = await elastic.elasticSearchID(ID);
       // console.log(ans)
        if (ans.length) {
            intent = ans[0]._source.intent
            objEntity=ans[0]._source.entities
           // console.log(objEntity)
            Answer = ans[0]._source.answer;
            defaultAnswer = ans[0]._source.default_answer;
            return {intent: intent, listEn: objEntity, answer: Answer, default_ans: defaultAnswer};
        }
        else{
            return{} //await this.elasticDetectQuestion(question)
        };
        
    },

    // async elasticDetectQuestion(question) {
    //     const wit = new WitApi(); 
    //     //get data from wit.ai by Question
    //     let blockData = await wit.detectQuestion(question);
    //    // console.log(blockData);
    //     blockData = blockData.entities;
    //    // console.log(blockData);
    //     if (await method.isEmpty(blockData)) return {}
    //     //convert get intent:String
    //     let intent = await method.convertToIntent(blockData);
    //    // console.log(intent);
    //     //convert get enitities:{entity: valueEntity}
    //     let objEntity = await method.convertToEntity(blockData);
    //     // let Entity = blockData;
    //     //convet to param: [entity]
    //     let params = Object.keys(objEntity).toString();
    //     //this.elasticSearchValue(objEntity, params)
    //     let defaultAnswer='';
    //     //query database get default Answer
    //     if(typeof intent=='undefined') return {}
    //     let def_ans = await elastic.elasticSearch(intent, params);
    //     // console.log(def_ans);
    //     if (def_ans.length) {
    //         defaultAnswer = def_ans[0]._source.default_answer; 
    //     }

    //     let dataRes = { intent: intent, listEn: objEntity, answer:'', default_ans: defaultAnswer };
    //     return dataRes;
    // },


    async elasticDetectIntent(question) {
        const wit = new WitApi(); 
        //get data from wit.ai by Question
        let blockData = await wit.detectQuestion(question);
        blockData = blockData.entities;
         //console.log("----------"+blockData);
        if (await method.isEmpty(blockData)) return {}
        //convert get intent:String
        let intent = await method.convertToIntent(blockData);
        let objEntity = await method.convertToEntity(blockData);
        //console.log("-------33333---"+objEntity);
        let dataRes = { intent: intent, listEn: objEntity };
        return dataRes;
    },
    async elasticDetectAnswer(intent, params){
        let defaultAnswer='';
        let Answer='';
        if(typeof intent=='undefined') return {}
        let def_ans = await elastic.elasticSearch(intent, params);
       // console.log(def_ans);
        console.log("kk: "+params);
       //  console.log('zzzzzzzzzzzzzzz---zzzz');
        if (def_ans.length) { 
            var index =-1;
            for(let i=0; i<def_ans.length; i++){
                console.log("for: "+def_ans[i]._source.params);
                if(params==def_ans[i]._source.params){
                    index = i;
                    break;
                }
            }
            if(index==-1) return {};
            else{
               // console.log("zzzzzzzzz: "+def_ans[index]);
                defaultAnswer = def_ans[index]._source.default_answer; 
                let dataRes = {answer: Answer, default_ans: defaultAnswer };
                return dataRes;
            }
        }
        
    },

    //hien thi list ban dau
    async sendIntentEntityToClient() {
        const wit = new WitApi();
        //get list enitities from wit.ai
        let listEntities = [];
        listEntities = await wit.entities();
        let dataRes = {};
        if (!listEntities.error) {
            listEntities.splice(listEntities.indexOf('intent'), 1);
            //remove default entities by regular expression
            let regexp = /^wit/
            listEntities = listEntities.filter(el => !regexp.test(el))
            //get list intent from wit.ai
            let infoIntent = await wit.infoEntity('intent');
            let listIntent = [];
            //filter to array intent
            infoIntent.values.forEach(el => listIntent.push(el.value));
            dataRes = { intent: listIntent, entities: listEntities }
        }
        return dataRes;
    },

    //recive message and reply answer
    async reciveToReply(message) {
        let defaultReply = "I don't understand!";
        let botAnswerID = await this.elasticDetectID(message);
        
        if (await method.isEmpty(botAnswerID)) {
            let data={} 
            //data:|| { intent: 'question',listEn: { action: 'go', place: 'vietnam' } }
            data = await this.elasticDetectIntent(message);
            if (await method.isEmpty(data)) {
                //console.log('a1');
                return defaultReply; 
            }
            let params = Object.keys(data.listEn).sort().toString();
            let botAnswer = await this.elasticDetectAnswer(data.intent, params);

            if(await method.isEmpty(botAnswer)){
                //console.log('a2');
                return defaultReply; 
            }
            else{
                if(botAnswer.default_ans==''){
                    return 'no information';
                }else{
                    //console.log('a22');
                    return botAnswer.default_ans;
                }
            }
        }
        else{
            if(botAnswerID.answer==''){
                if(botAnswerID.default_ans==''){
                    return '2no information';
                }else{
                    //console.log('a3');
                    return botAnswerID.default_ans;
                }
            }
            else {
                //console.log('a4');
                return botAnswerID.answer; 
            }
        }
    },

    async trainingBot(dataReq) {
        const wit = new WitApi();
        let dataRes = method.convertData(dataReq);
        let text = dataRes.text;
        let entities = dataRes.entities;
        return await wit.trainingQuestion(text, entities);
    },

    //Create Entity
    //Create Entiti on wit.ai
    async createEntity(id) {
        const wit = new WitApi();
        return await wit.createEntity(id, []);
    },

    //delete Entity on wit.ai
    async deleteEntity(id) {
        let success = [];
        let fail = [];
        if (!Array.isArray(id)) id = [id];
        for (let i = 0; i < id.length; i++) {
           // let data = await queryDb.queryEntity(id[i]);
            let data = await elastic.elasticDeleteEnity(id[i]);
            if (data.length == 0) {
                let wit = new WitApi();
                let bool = await wit.deleteEntity(id[i]);
                if (!bool.error)
                    success.push(id[i]);
            }
            else {
                fail.push(id[i]);
            }
        }
        let result = {};
        result.success = success.toString();
        result.fail = fail.toString();
        return result;
    },

    async createIntent(id) {
        const wit = new WitApi();
        return await wit.createIntent(id);
    },

    async deleteIntent(id) {
        let success = [];
        let fail = [];
        let result = {};
        result.success = [];
        result.fail = [];
        if (!Array.isArray(id)) id = [id];
        for (let i = 0; i < id.length; i++) {
            //let data = await queryDb.queryIntent(id[i]);
            let data = await elastic.elasticDeleteIntent(id[i]);
            //console.log(data);
            if (data.length == 0) {
                let wit = new WitApi();
                bool = await wit.deleteIntent(id[i]);
                success.push(id[i]);
            }
            else {
                fail.push(id[i]);
            }
        }
        result.success = success.toString();
        result.fail = fail.toString();
        return result;
    },

    async getQuestion() {     
        let dataQuestion = await elastic.match_all();
        let dataRes=[];
        for(let i=0; i<dataQuestion.length;i++){
            let data ={};
            data.params = dataQuestion[i]._source.entities;
            data.intent = dataQuestion[i]._source.intent;
            data.text = dataQuestion[i]._source.question;
            data.entities =dataQuestion[i]._source.params;   
            dataRes.push(data) 
        }
        return dataRes;
    },

    async deleteQuestions(samples) {
        const wit = new WitApi();
        let dataDelete = [];
        if (!Array.isArray(samples)) samples = [samples];
        for (let i = 0; i < samples.length; i++) {
            let elementDelete = {};
            elementDelete.text = samples[i];
            dataDelete.push(elementDelete);
        }

        let result = await wit.deleteQuestion(dataDelete);
        if(result.sent){
            
            dataDelete.forEach(async el=>{let ID = await md5(el.text);
                let a = await elastic.elasticDeleteQuestion(ID);
            ;})
        }
        
        return result;
    },

    // async deleteDocumentDB(question) {
    //     await queryDb.deleteDocument(question);
    // },


}