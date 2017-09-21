var Helpers = {
  maxWorkTime: 600,
  minWorkDescriptionLength: 5,
  maxVisibleWorkDescriptionLength: 20,

  validateWorkEntry(description,minutes) {
    if (description.length < Helpers.minWorkDescriptionLength) return false;
    if (
      /^\s*$/.test(minutes) ||
      Number.isNaN(Number(minutes)) ||
      minutes < 0 ||
      minutes > Helpers.maxWorkTime
    ) {
      return false;
    }

    return true;
  },

  formatWorkDescription(description) {
    if (description.length > Helpers.maxVisibleWorkDescriptionLength) {
      description = `${description.substr(0,Helpers.maxVisibleWorkDescriptionLength)}...`;
    }
    return description;
  },

  formatTime(time) {
    var hours = Math.floor(time / 60);
    var minutes = time % 60;
    if (hours == 0 && minutes == 0) return "";
    if (minutes < 10) minutes = `0${minutes}`;
    return `${hours}:${minutes}`;
  }
}

var UI = setupUI();
UI.init();

var App = setupApp(UI);

// hard coding some initial data
App.addProject("client features");
App.addProject("overhead");
App.addProject("backlog");

  
function setupUI () {
  const projectTemplate = "<div class='project-entry'><h3 class='project-description' rel='js-project-description'></h3><ul class='work-entries' rel='js-work-entries'></ul><span class='work-time' rel='js-work-time'></span></div>";
  const workEntryTemplate = "<li class='work-entry'><span class='work-time' rel='js-work-time'></span><span class='work-description' rel='js-work-description'></span></li>";

  var $workEntryForm;
  var $workEntrySelectProject;
  var $workEntryDescription;
  var $workEntryTime;
  var $workEntrySubmit;
  var $totalTime;
  var $projectList;

  var projectElements = {};
  var workElements = {};

  var publicAPI = {
    init: initUI,
    addProjectToList: addProjectToList,
    addProjectSelection: addProjectSelection,
    addWorkEntryToList: addWorkEntryToList,
    updateProjectTotalTime: updateProjectTotalTime,
    updateWorkLogTotalTime: updateWorkLogTotalTime
  }
  
  return publicAPI;

  // *********************-------------------------------------------------8888888888888888888888

  function initUI() {
    $workEntryForm = $("[rel*=js-work-entry-form");
    $workEntrySelectProject = $workEntryForm.find("[rel*=js-select-project]");
    $workEntryDescription = $workEntryForm.find("[rel*=js-work-description]");
    $workEntryTime = $workEntryForm.find("[rel*=js-work-time]");
    $workEntrySubmit = $workEntryForm.find("[rel*=js-submit-work-entry]");
    $totalTime = $("[rel*=js-total-work-time]");
    $projectList = $("[rel*=js-project-list]");

    $workEntrySubmit.on("click",submitNewWorkEntry);
  }

  function submitNewWorkEntry() {
    var projectId = $workEntrySelectProject.val();
    var description = $workEntryDescription.val();
    var minutes = $workEntryTime.val();

    if (!Helpers.validateWorkEntry(description,minutes)) {
      alert("Oops, bad entry. Try again.");
      $workEntryDescription[0].focus();
      return;
    }

    function setupWorkDescription (workEntryData,$workDescription) {
      $workDescription.text(Helpers.formatWorkDescription(workEntryData.description));
  
      if (workEntryData.description.length > maxVisibleWorkDescriptionLength) {
        $workDescription
          .addClass("shortened")
          .on("click",function onClick(){
            $workDescription
              .removeClass("shortened")
              .off("click",onClick)
              .text(workEntryData.description);
          });
      }
    }

    $workEntryDescription.val("");
    $workEntryTime.val("");
    addWorkToProject(Number(projectId),description,Number(minutes));
    $workEntryDescription[0].focus();
  }

  function addProjectToList(projectEntryData) {
    let {id, description} = projectEntryData;
    var $project = $(projectTemplate);
    $project.attr("data-project-id",id);
    $project.find("[rel*=js-project-description]").text(description);
    $projectList.append($project);

    projectElements[id] = $project;
  }

  function addProjectSelection(projectEntryData) {
    let {id, description} = projectEntryData;
    var $option = $("<option></option>");
    $option.attr("value",id);
    $option.text(description);
    $workEntrySelectProject.append($option);
  }

  function addWorkEntryToList(projectEntryData, workEntryData) {
    var $projectEntry = projectElements[projectEntryData.id];
    var $projectWorkEntries = $projectEntry.find("[rel*=js-work-entries]");

    // create a new DOM element for the work entry
    var $workEntry = $(workEntryTemplate);
    $workEntry.attr("data-work-entry-id",workEntryData.id);
    $workEntry.find("[rel*=js-work-time]").text((workEntryData.time));
    setupWorkDescription(workEntryData,$workEntry.find("[rel*=js-work-description]"));

    workElements[workEntryData.id] = $workEntry;

    // multiple work entries now?
    if (App.getWorkEntryCount(projectEntryData.id)) {
      { let adjacentWorkEntryId, insertBefore;
        [ adjacentWorkEntryId, insertBefore ] = App.getWorkEntryLocation(projectEntryData, workEntryData.id);

        // insert the entry into the correct location in DOM
        if (insertBefore) {
          workElements[adjacentWorkEntryId].before($workEntry);
        }
        else {
          workElements[adjacentWorkEntryId].after($workEntry);
        }
      }
    }
    // otherwise, just the first entry
    else {
      $projectEntry.addClass("visible");
      $projectWorkEntries.append($workEntry);
    }
  }

  function updateProjectTotalTime(projectEntryData) {
    var $projectEntry = projectEntryData.$element;
    $projectEntry.find("> [rel*=js-work-time]").text(Helpers.formatTime(projectEntryData.time)).show();
  }

  function updateWorkLogTotalTime() {
    if (projects.time > 0) {
      $totalTime.text(Helpers.formatTime(projects.time)).show();
    }
    else {
      $totalTime.text("").hide();
    }
  }
}
  
function setupApp (UI) {
  
  var projects = [];
  var totalTime =0;

  var publicAPI = {
    addProject: addProject,
    addWorkToProject: addWorkToProject,
    getWorkEntryCount: getWorkEntryCount,
    getWorkEntryLocation: getWorkEntryLocation  
  }

  return publicAPI;


  // **************************

  function addProject(description) {
    var projectEntryData;

    { let projectId;
      projectId = Math.round(Math.random()*1E4);
      projectEntryData = { id: projectId, description: description, work: [], time: 0 };
    }
    projects.push(projectEntryData);

    UI.addProjectToList(projectEntryData);
    UI.addProjectSelection(projectEntryData);
  }

  function findProjectEntry(projectId) {
    for (let i = 0; i < projects.length; i++) {
      if (projects[i].id === projectId) {
        return projects[i];
      }
    }
  }

  function addWorkToProject (projectId,description,minutes) {
    projects.time = (projects.time || 0) + minutes;

    var projectEntryData = findProjectEntry(projectId);
    projectEntryData.time = (projectEntryData.time || 0) + minutes;

    // create a new work entry for the list
    var workEntryData = { id: projectEntryData.work.length + 1, description: description, time: minutes };
    projectEntryData.work.push(workEntryData);

    // multiple work entries now?
    if (projectEntryData.work.length > 1) {
      // sort work entries in descending order of time spent
      projectEntryData.work = projectEntryData.work.slice().sort(function sortTimeDescending(a,b){
        return b.time - a.time;
      });
    }

    UI.addWorkEntryToList(projectEntryData,workEntryData);
    UI.updateProjectTotalTime(projectEntryData);
    UI.updateWorkLogTotalTime();
  }

  function getWorkEntryCount (projectId) {
    let projectEntryData = findProjectEntry(projectId);
    return projectEntryData.work.length;
  }

  function getWorkEntryLocation (projectEntryData, workEntryId) {
    var entryIdx;
		for (let i = 0; i < projectEntryData.work.length; i++) {
			if (projectEntryData.work[i].id == workEntryId) {
				entryIdx = i;
				break;
			}
    }
    
    if (entryIdx < (projectEntryData.work.length - 1)) {
			return [ projectEntryData.work[entryIdx + 1].id, /*insertBefore=*/true ];
		}
		else {
			return [ projectEntryData.work[entryIdx - 1].id, /*insertBefore=*/false ];
		}
  }
};
