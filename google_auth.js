var oauthToken;
var returned_folder_id;

// RJ 12.01.15 The Client_id and the api key must be read from a global variables already set in Apex
// The API key and Client_id should be read from MM_CLOUD_OAUTH where mm_firm_id is set and the MM_APP_ID = 'GOOGLE'
//var api_key = 'AIzaSyAlWrf20Z3gjpqmAbR38exsIZvFUvSsTyM';
//var new_folder_name1 = 'Test0001';
//var new_folder_name2 = 'Hansenss';

/*



*/

function onApiLoad()
{
	
    gapi.load('auth',{'callback':onAuthApiLoad}); 
    gapi.load('picker');a
}

function onAuthApiLoad()
{
// 12.01.15 The Client_id ( and the api key ) should be taken from the Global (see above)

    window.gapi.auth.authorize({
            'client_id':'***********************', // client ID supllied by google 
            //'apiKey':'******' // API key if needed 
            'scope':['https://www.googleapis.com/auth/drive']
        },handleAuthResult);
} 

function handleAuthResult(authResult)
{
       
	   if(authResult && !authResult.error){
            
            oauthToken = authResult.access_token;
	        $s("P14_GOOGLE_TOKEN", oauthToken);
            searchPath();
			//var cv = $v("P14_MM_FOLDER_NAME");
			
        }
}


//var path = '/Customers/kunder/rchives'; // is case sensitive;
//var folder = path.substring(path.lastIndexOf("/")+1); 


function searchPath()
// 15.01.15 The folder must be within the path of the default folder. If the default folder is not set for the function, then open the picker in the root
/*
this function searches for the path of the folder that we get from the default path in Apex;
we have to make an actual REST request to the Google endpoint, because the javascript API dosent support this search; (of course you ca use different functions like https://developers.google.com/drive/web/folder , https://developers.google.com/drive/v2/reference/files/list)



*/

{
    var accessToken = oauthToken; 
    if (!accessToken) {
        return;
    }
    var s_folder = $v("P14_MM_FOLDER_NAME"); //new_folder_name1
    var url = "https://www.googleapis.com/drive/v2/files?q=title+%3D+'"+s_folder+ "'+and+mimeType+%3D+'application%2Fvnd.google-apps.folder'"
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.setRequestHeader("Authorization", "Bearer " + accessToken);
    xhr.onload = function (evt) {
        var response = JSON.parse(xhr.responseText);
        alert(response.items.length);
        if (response.items.length == 0) {
        uploadFile();
        } else {
		
		var item = response.items[1]; 
		
		alert(item.title); // show me the folder name;
        createPicker();
        }
        
    };
    xhr.send();
}

function uploadFile() 
// 15.01.15 The folder must be within the path of the default folder. If the default folder is not set for the function, then open the picker in the root
/*
create a folder with the specified name that we get from the Apex variable, and we set it to s_folder; 
*/

{
	var s_folder = $v("P14_MM_FOLDER_NAME");
        gapi.client.load('drive', 'v2', function() {
          //createPublicFolder(new_folder_name1 + new_folder_name2);   // the name of the folder we want to create- user input
		  createPublicFolder(s_folder);
        });
}

      
function createPublicFolder(folderName) 
{

        var body = {
          'title': folderName,
          'mimeType': "application/vnd.google-apps.folder"
        };

        var request = gapi.client.drive.files.insert({
          'resource': body
        });
		
		//var apex_share_with = $v("P14_MM_SHARE_WITH");
		//var share_with = 
		
        request.execute(function(resp) {
          //var share_with = $v("P14_MM_SHARE_WITH"); //
		  returned_folder_id = resp.id;
		  
//  12.01.15 The folder id and the folder link is to be saved in Apex variables, in order to write them to MM_GA_REF. But only if the GA Folder is set. If not only direct links to the documents
//  12.01.15 are going to be save to the global variables and afterwards to the MM_GA_REF (see below)
		  
		  //alert(returned_folder_id);
		  
		  var share_with = prompt("Who do you want to share it with? ");
          var permissionBody = {
            'value': share_with, // the user we want to share our doc with- user input
            'type': 'user',
            'role': 'writer'
          };
          var permissionRequest = gapi.client.drive.permissions.insert({
		    
            'fileId': resp.id,
            'resource': permissionBody,
			'emailMessage': 'I just shared this folder with you on our Google Drive! Thank you!',
			'sendNotificationEmails': true
          });
          permissionRequest.execute(function(resp) { 
			createPicker();
		  });
        });
}
      

function createPicker()
/*
- the function that actually builds the javascript drive interface;
- we can add different views and actions;
- google source: https://developers.google.com/picker/docs/ ;

*/
{ //var brows_lang=$v('CTR_MM_LANG_ID');    
  //alert(ids);
  var picker = new google.picker.PickerBuilder()
                    .setOAuthToken(oauthToken)
					//.setOrigin(window.location.protocol + '//' + window.location.host) // so it works on Chrome 18122014
					//.setDeveloperKey(api_key)
                    //.setAuthUser(account.get('email'))
                    .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
					//.setLocale('')
                    .addView(new google.picker.DocsUploadView() //Upload
                            .setIncludeFolders(true)
                            .setParent(returned_folder_id))
                    .addView(new google.picker.DocsView() //My drive
                            .setOwnedByMe(true)
                            .setIncludeFolders(true)
                            .setSelectFolderEnabled(true))
                    .addView(new google.picker.DocsView() //Shared
                            .setOwnedByMe(false)
                            .setIncludeFolders(true)
                            .setSelectFolderEnabled(true))
                    .addView(google.picker.ViewId.RECENTLY_PICKED) //Recent picked
                    .addView(new google.picker.DocsView() //All files
                            .setIncludeFolders(true)
                            .setSelectFolderEnabled(true))
                    .setCallback(pickerCallback)
                    .build();
				picker.setVisible(true);
}

function pickerCallback(data) 
/*
- the response from the picker select. when the user uploads a file of any kind, we get back the name, id and link from the Google drive and we can assign them to Apex variables
- we also have to option that when a user clicks on a document or folder we can return the name, link and id of that selected item. 


*/
{
        var url = 'nothing';
        if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) 
		{
          var doc = data[google.picker.Response.DOCUMENTS][0];
		  //alert(doc);
          url = doc[google.picker.Document.URL];
		  file_name = doc[google.picker.Document.NAME];
		  f_id = doc[google.picker.Document.ID];
		  f_url = doc[google.picker.Document.URL]
		  alert(file_name);
		  alert(f_id);
		  alert(f_url);
		  console.log(f_url);
// 12.01.15 These variables are always set, as a result of any upload in the picker..
      /*  $s("P14_MM_DOC_LINK", url);
		  $s("P14_MM_DOC_ID", f_id);
		  $s("P14_MM_TITLE", file_name); */
        }
        
 }



