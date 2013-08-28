"use strict";

//IE undefined console fix
if (!window.console) console = {log: function() {}};
		
var filter = ''
var root = '{{root}}';
var pageIndex = 0;
var pageLength = 12;
var userNameFilter = '';
var vwfPortalModel = new function(){
	var self = this;
	self.getShorterStr = function(a, length){
		if(a == undefined)
			return '';
		
		var obj = {};
		obj.title = a.title ? a.title : a;
		length = length ? length : 55;
		return (obj.title.length>length)? obj.title.substr(0, length - 3) + '...' : obj.title;
	};
	self.user = ko.observable({
		isLoggedIn: false,
		isAdmin: false,
		username: 'Guest'
	});
	
	self.toggleNameFilter = function(){
	
		if(userNameFilter){
			userNameFilter  = '';
			$("#allWorlds").addClass("active");
			$("#yourWorlds").removeClass("active").blur();
		}			
		else{
			userNameFilter  = self.user().username;
			$("#yourWorlds").addClass("active");
			$("#allWorlds").removeClass("active").blur();
		}

		showStates();
	};			
	
	self.filterVal = ko.computed({
		read:  function(){ return ''; }, 
		write: function(str){ 
			if(filter != str){
				filter = str;
				pageIndex = 0;
				showStates(); 
			}
		}	
	}).extend({throttle:500});
	
	self.worldObjects = ko.observableArray([]);
	self.displayWorldObjects = ko.observableArray([]);
	self.featuredWorldObjects = ko.observableArray([]);
	self.getNextPage = function(){
		if(self.nextDisabled() === false)
			self.getPage(1);
	};
	self.getPreviousPage = function(){
		if(self.previousDisabled() === false)
			self.getPage(-1);
	};
	
	self.previousDisabled = ko.observable(true);
	self.nextDisabled = ko.observable(true);
	
	self.getPage = function(i){
		var worldObjectsLength = getArrVisibleLength(self.worldObjects());
		pageIndex += i;
		self.displayWorldObjects(getArrVisible(self.worldObjects(), pageIndex*pageLength));
	
		if((pageIndex+1)*pageLength < worldObjectsLength){
			self.nextDisabled(false);
		}
		
		else self.nextDisabled(true);
		
		if(pageIndex > 0){
			self.previousDisabled(false);
		}
		else self.previousDisabled(true);
		
	};
	
	self.handleEditDisplay = function(obj, e){
		if(($(e.relatedTarget).hasClass("editstatedata") ||  $(e.relatedTarget).hasClass("editstatedelete")) && e.type == "mouseout")
			return;
		obj.editVisible(e.type === "mouseover");
	};
};

function checkFilter(textArr){
	
	//textArr[2] is the owner of the world
	
	if(userNameFilter && userNameFilter != textArr[2]){
		return false;
	}
	
	if(filter != ""){
		for(var i = 0; i < textArr.length; i++){
			if(textArr[i] && textArr[i].toLowerCase().indexOf(filter.toLowerCase()) != -1)
				return true;
		}
		return false;
	}			
	
	else return true;
}

function getFlatIdArr(resetHotstate){
	var tempArr = [];
	
	//Get all world IDs in flat array form
	for(var i = 0; i < vwfPortalModel.worldObjects().length; i++){
		tempArr.push(vwfPortalModel.worldObjects()[i].id);
	}
	
	return tempArr;
}

function getArrVisibleLength(arr){
	var count = 0;
	for(var i = 0; i < arr.length; i++){
		if(arr[i].isVisible == true)
			count++;
	}
	
	return count;
};		
function getArrVisible(arr, start){
	var tempArr = [];
	var count = 0;
	for(var i = start; i < arr.length && count < pageLength; i++){
	
		if(arr[i].isVisible == true){
			tempArr.push(arr[i]);
			count++;
		}
	}
	
	return tempArr;
};

function removeAgoFromMoment(date){
	var temp = moment(date).fromNow();
	return temp.substr(0, temp.length - 4);
};

function showStates(){

	$.getJSON("./vwfDataManager.svc/states",function(e){
		console.log(e)
		
		var tempArr = getFlatIdArr();
		var saveIndex = 0;
		var featuredIndex = 0;
		var i = 0;
		
		for(var tmpKey in e){
		
			if(e.hasOwnProperty(tmpKey)){

				var id = tmpKey.substr(13,16);
				e[tmpKey].id = id;

				//The incoming data elements may not be in the same order as existing elements, get proper index
				saveIndex = tempArr.indexOf(id) > -1 ? tempArr.indexOf(id) : i++;
				
				e[tmpKey].lastUpdate = e[tmpKey].lastUpdate?removeAgoFromMoment(e[tmpKey].lastUpdate):removeAgoFromMoment(new Date());
				e[tmpKey].description = e[tmpKey].description ? e[tmpKey].description : "";
				e[tmpKey].updates = e[tmpKey].updates > 0 ? e[tmpKey].updates : 0;
				e[tmpKey].editVisible = ko.observable(false);
				
				if(e[tmpKey].featured === true && featuredIndex < 3){
					vwfPortalModel.featuredWorldObjects()[featuredIndex] = e[tmpKey];
					featuredIndex++;
				}
				
				e[tmpKey].isVisible = checkFilter([e[tmpKey].title, e[tmpKey].description, e[tmpKey].owner]);
				vwfPortalModel.worldObjects()[saveIndex] = e[tmpKey];	
				vwfPortalModel.worldObjects()[saveIndex].hotState = vwfPortalModel.worldObjects()[saveIndex].hotState ? vwfPortalModel.worldObjects()[saveIndex].hotState : ko.observable(false);
			}
		}
		
		vwfPortalModel.getPage(0);
		vwfPortalModel.featuredWorldObjects.valueHasMutated();
		vwfPortalModel.worldObjects.valueHasMutated();
		
		$.getJSON("./admin/instances",function(e){
		
			//Get all world IDs in flat array form
			var tempArr = getFlatIdArr();
			var saveIndex = 0;
			
			//Iterate through keys, get index of world id which matches key, set its hotState to true
			for(var tmpKey in e){
		
				if(e.hasOwnProperty(tmpKey)){
					saveIndex = tempArr.indexOf(tmpKey.substr(13,16));
											
					if(saveIndex > -1){
						vwfPortalModel.worldObjects()[saveIndex].hotState(true);
					}	
					
					else{
						vwfPortalModel.worldObjects()[saveIndex].hotState(false);
					}
				}
			}
			
			vwfPortalModel.worldObjects().sort(sortArrByUpdates);
			vwfPortalModel.getPage(0);
		});
	});
}

function sortArrByUpdates(a, b){
	console.log(a.hotState(), b.hotState());
	if(a.hotState() == true && b.hotState() == false)
		return -1;			
	
	else if(b.hotState() == true && a.hotState() == false)
		return 1;
		
	return b.updates - a.updates;
}

function getLoginInfo(defaultCb, failCb){
	
	$.ajax('/vwfDataManager.svc/logindata',
	{
		cache:false,
		success:function(data,status,xhr){
			
			data = JSON.parse(xhr.responseText);
			vwfPortalModel.user().username = data.username;
			vwfPortalModel.user().isAdmin = data.admin;
			vwfPortalModel.user().isLoggedIn = (data.username)?true:false;
			vwfPortalModel.user.valueHasMutated();
			
			if(defaultCb) defaultCb();
		},
		error:function(){
			if(failCb) failCb();
			else if(defaultCb) defaultCb();
		}
	});
}