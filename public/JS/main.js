const socket = io();

let uuid = "";
let processing = false;

let fileUpload = [];

$("#textinput").css("height", `${$("#textinput")[0].scrollHeight}px`);
$("#bottomarea").css("opacity", "1");
$("#textinput").on("input", function() {
  $(this).css("height", "");
  $(this).css("height", `${this.scrollHeight}px`);
  $("#chat").css("padding-bottom", `${200 + ($("#textinput")[0].offsetHeight - 48) + $("#filearea")[0].offsetHeight}px`);
});

socket.emit("LoadSettings");

function openNewChat() {
  document.title = "ChatBeyond";
  $("#settings").hide(200);
  $("#bottomarea").show(200);
  $("#newchatarea").show(200);
  $("#chat").hide(200);

  $("#textinput").val("");
  $("#textinput").css("height", "");
  $("#textinput").css("height", `${$("#textinput")[0].scrollHeight}px`);
  $("#chat").css("padding-bottom", "200px");

  $("#newchatarea .message").hide(200);
  $("#chatname").val("");

  $("#chat").empty();

  $("#filearea").html("");
  fileUpload = [];

  uuid = "";
}

function openSettings() {
  document.title = "ChatBeyond: Settings";
  $("#settings").show(200);
  $("#bottomarea").hide(200);
  $("#newchatarea").hide(200);
  $("#chat").hide(200);

  $("#apikey").attr("style", "-webkit-text-security: disc;");
  $("#revealapikey").text("Show");

  socket.emit("LoadSettings");

  lenis.stop();
  window.scrollTo({top: 0, behavior: "instant"});
  lenis.start();
}

function openExistingChat(uuidChat) {
  $("#settings").hide(200);
  $("#bottomarea").show(200);
  $("#newchatarea").hide(200);
  $("#chat").show();

  $("#textinput").val("");
  $("#textinput").css("height", "");
  $("#textinput").css("height", ($("#textinput")[0].scrollHeight) + "px");
  $("#chat").css("padding-bottom", "200px");

  $("#filearea").html("");
  fileUpload = [];

  uuid = uuidChat;

  socket.emit("LoadMessages", uuid);
}

const sidebar = $("#sidebar");
socket.emit("LoadChatData");

$(document).on("click", "#models div", function() {
  let index = $("#models div").index(this);
  let model;
  $("#models div").each(function(i, element) {
    $(element).removeClass("selected");
    if (i === index) {
      $(element).addClass("selected");
      model = $(element).find("h3").html();
    }
  });
  socket.emit("SaveSetting", "model", model);
});

$(document).on("change", "#apikey", function() {
  socket.emit("SaveSetting", "apikey", $(this).val());
});

$("#revealapikey").on("click", function() {
  if ($("#apikey").attr("style") === "") {
    $("#apikey").attr("style", "-webkit-text-security: disc;");
    $(this).text("Show");
  }
  else {
    $("#apikey").attr("style", "");
    $(this).text("Hide");
  }
});

$("#cleanfiles").on("click", function() {
  processing = true;
  socket.emit("ClearUnusedFiles");
});

$("#themeselection").on("change", function() {
  socket.emit("ChangeTheme", $("#themeselection").val().toUpperCase());
});
$("#newchatarea #chatname").on("keyup keydown", function() {
  if ($(this).val() === "") {
    $("#newchatarea .message").hide(200);
  }
  else {
    $("#newchatarea .message").show(200);
  }
});

$("#settingsicon").on("click", function() {
  if (processing) {
    return;
  }
  openSettings();
});
$("#newchat, #logo").on("click", function() {
  if (processing) {
    return;
  }
  openNewChat();
});

$("#filebutton").on("click", function() {
  $("#fileinput").click();
});
$("#fileinput").on("change", function() {
  if (this.files[0]) {
    const file = this.files[0];

    if (file.size > 1e8) {
      Swal.fire({
        icon: "error",
        title: "Unsupported Type",
        text: "That file is too big!",
        confirmButtonColor: "#666666",
        confirmButtonText: "Okay"
      });
      return;
    }

    fileUpload.push({
      uploadedData: file,
      uuidName: ""
    });
    if (file.type.startsWith("image/")) {
      $("#filearea").append(`
        <div class="fileitem">
          <div>
            <img title="${file.name}" src="${URL.createObjectURL(file)}">
          </div>
          <div class="fileinfo">
            <div class="name" title="${file.name}">${file.name}</div>
            <div class="size" title="${formatToFileSize(file.size)}">${formatToFileSize(file.size)}</div>
          </div>
          <button class="removebutton"><img src="/Assets/Cross.svg"></button>
        </div>
      `);
    }
    else {
      $("#filearea").append(`
        <div class="fileitem">
          <div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
              <path d="M14 2v6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
          </div>
          <div class="fileinfo">
            <div class="name" title="${file.name}">${file.name}</div>
            <div class="size" title="${formatToFileSize(file.size)}">${formatToFileSize(file.size)}</div>
          </div>
          <button class="removebutton"><img src="/Assets/Cross.svg"></button>
        </div>
      `);
    }
    const latestButton = $("#filearea .fileitem .removebutton").last();
    latestButton.on("click", function() {
      const name = $(this).parent().find(".fileinfo").find(".name").text();
      fileUpload = fileUpload.filter(file => file.uploadedData.name !== name);
      $(this).parent().remove();
      if ($("#filearea").html().trim() === "") {
        $("#filearea").html("");
      }
      $("#chat").css("padding-bottom", `${200 + ($("#textinput")[0].offsetHeight - 48) + $("#filearea")[0].offsetHeight}px`);
    });
    $("#chat").css("padding-bottom", `${200 + ($("#textinput")[0].offsetHeight - 48) + $("#filearea")[0].offsetHeight}px`);

    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result;
      socket.emit("FileUpload", {
        name: file.name,
        type: file.type,
        data: arrayBuffer
      }, fileUpload.length - 1);
    };
    reader.readAsArrayBuffer(file);

    this.value = null;
  }
});

$("#textinput").on("wheel", function(event) {
  const scrollTop = this.scrollTop;
  const scrollHeight = this.scrollHeight;
  const clientHeight = this.clientHeight;
  const delta = event.originalEvent.deltaY;

  if (!((delta < 0 && scrollTop === 0) || (delta > 0 && scrollTop + clientHeight >= scrollHeight))) {
    event.stopPropagation();
  }
});

$("#textinput").on("keydown", function(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    $("#sendbutton").click();
  }
});

$("#sendbutton").on("click", function() {
  if (processing) {
    return;
  }
  if ($("#chatname").val().trim() === "" && uuid === "") {
    Swal.fire({
      icon: "error",
      title: "No chat name",
      text: "Please put a name for your new conversation.",
      confirmButtonColor: "#666666",
      confirmButtonText: "Okay"
    });
    return;
  }
  if ($("#textinput").val().trim() === "") {
    Swal.fire({
      icon: "error",
      title: "Cannot send empty message",
      text: "Your message cannot be empty. Please put your message to send.",
      confirmButtonColor: "#666666",
      confirmButtonText: "Okay"
    });
    return;
  }
  processing = true;

  socket.emit("SendMessage", $("#textinput").val().trim(), uuid !== "" ? uuid : $("#chatname").val().trim(), fileUpload.map(data => data.uuidName));

  $("#filearea").html("");
  fileUpload = [];
});

$("#costbutton").on("click", function() {
  if (processing) {
    return;
  }
  if ($("#textinput").val().trim() === "") {
    Swal.fire({
      icon: "error",
      title: "Cannot calculate",
      text: "Your message cannot be empty. Please put something to calculate.",
      confirmButtonColor: "#666666",
      confirmButtonText: "Okay"
    });
    return;
  }
  processing = true;
  $("#cost").html(`Estimated Input Cost: Calculating...`);
  socket.emit("CalculateCost", uuid, $("#textinput").val().trim(), fileUpload.map(data => data.uuidName));
});

socket.on("connect", () => {
  socket.on("LoadChatData", function(chats) {
    $("#pastchats").empty();
    for (const category in chats) {
      $("#pastchats").append(`
        <div class="category">${category}</div>
      `);
      $("#pastchats").append(`
        <ul class="list"></ul>
      `);
      const latestListAdded = $("#pastchats ul").last();
      for (let i = 0; i < chats[category].length; i++) {
        const theme = $("#themeselection").val().toUpperCase();
        if (theme === "LIGHT") {
          $(latestListAdded).append(`
            <li data-uuid="${chats[category][i]["uuid"]}"><span>${chats[category][i]["title"]}</span><button class="deletebutton"><img src="/Assets/BinBlack.svg"></button></li>
          `);
        }
        else if (theme === "DARK") {
          $(latestListAdded).append(`
            <li data-uuid="${chats[category][i]["uuid"]}"><span>${chats[category][i]["title"]}</span><button class="deletebutton"><img src="/Assets/BinWhite.svg"></button></li>
          `);
        }
      }
    }
    $("#pastchats .list li").on("click", function() {
      if (processing) {
        return;
      }
      document.title = "ChatBeyond: " + $(this).find("span").html();
      openExistingChat($(this).data("uuid"));
    });
    $("#pastchats .list li .deletebutton").on("click", function(event) {
      event.stopPropagation();
      if (processing) {
        return;
      }
      Swal.fire({
        icon: "warning",
        title: "Are you sure you want to delete this chat?",
        text: "You won't be able to revert this.",
        showCancelButton: true,
        confirmButtonColor: "#c24848",
        cancelButtonColor: "#666666",
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel"
      }).then((result) => {
        if (result.isConfirmed) {
          socket.emit("DeleteChat", $(this).parent().data("uuid"));
        }
      });
    });
  });
  socket.on("LoadMessages", function(messages, imageTypes) {
    $("#chat").empty();
    for (let i = 0; i < messages.length; i++) {
      if ("files" in messages[i]) {
        for (let j = 0; j < messages[i].files.length; j++) {
          let isImage = false;
          for (let k = 0; k < imageTypes.length; k++) {
            if (messages[i].files[j].endsWith(imageTypes[k])) {
              isImage = true;
            }
          }

          if (isImage) {
            $("#chat").append(`
              <div class="message user file"><img src="/files/${messages[i].files[j]}"><span class="subtext image">${messages[i].files[j]}</span></div>
            `);
          }
          else {
            $("#chat").append(`
              <div class="message user file">
                <span class="fileicon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                    <path d="M14 2v6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                  </svg>
                </span>
                <span class="subtext file">${messages[i].files[j]}</span>
              </div>
            `);
          }
          const latestFile = $("div.file .fileicon, div.file img").last();
          latestFile.on("click", function() {
            socket.emit("ShowFile", $(this).parent().find(".subtext").text());
          });
        }
      }

      if (messages[i].role === "user") {
        $("#chat").append(`
          <div class="message user">${$("<div>").text(messages[i].content).html()}</div>
        `);
      }
      else {
        $("#chat").append(`
          <div class="message">${messages[i].content}</div>
        `);
      }
    }

    hljs.highlightAll();
    $("#chat a").attr("target", "_blank");

    lenis.stop();
    window.scrollTo({top: document.body.scrollHeight, behavior: "instant"});
    lenis.start();
  });
  socket.on("LoadSettings", function(models, settings) {
    $("#apikey").val(settings.apikey);
    $("#models").empty();
    for (const model in models) {
      $("#models").append(`
        <div>
          <h3>${model}</h3>
          <p><b>Description</b><br>${models[model].description}</p>
          <p><b>Costs</b><br>$${formatToMoney(models[model].cost.input)} per 1,000,000 tokens for Input<br>$${formatToMoney(models[model].cost.output)} per 1,000,000 tokens for Output</p>
          <p class="small"><b>Web Search</b><br>${models[model].web ? "Available" : "Not Available"}</p>
          <p class="small"><b>Reasoning</b><br>${models[model].reasoning ? "Available" : "Not Available"}</p>
        </div>
      `);
      const latestModelAdded = $("#models div").last();
      if (model === settings.model) {
        $(latestModelAdded).addClass("selected");
      }
    }
    $("#themeselection").val(settings.theme.toLowerCase());
    if (settings.theme === "LIGHT") {
      $("#theme").attr("href", "/CSS/light.css");
      $("#settingsicon").attr("src", "/Assets/SettingsBlack.svg");
      $("#logo").attr("src", "/Assets/LogoBlack.png");
      $("#codestyling").attr("href", "https://unpkg.com/@highlightjs/cdn-assets@11.11.1/styles/atom-one-light.min.css");
      $("#filebutton img").attr("src", "/Assets/FileBlack.svg");
      $("#reasoningbutton img").attr("src", "/Assets/LightbulbBlack.svg");
      $("#pastchats .list li .deletebutton img").attr("src", "/Assets/BinBlack.svg");
    }
    else if (settings.theme === "DARK") {
      $("#theme").attr("href", "/CSS/dark.css");
      $("#settingsicon").attr("src", "/Assets/SettingsWhite.svg");
      $("#logo").attr("src", "/Assets/LogoWhite.png");
      $("#codestyling").attr("href", "https://unpkg.com/@highlightjs/cdn-assets@11.11.1/styles/atom-one-dark.min.css");
      $("#filebutton img").attr("src", "/Assets/FileWhite.svg");
      $("#reasoningbutton img").attr("src", "/Assets/LightbulbWhite.svg");
      $("#pastchats .list li .deletebutton img").attr("src", "/Assets/BinWhite.svg");
    }
  });
  socket.on("NewMessage", function(originalMessage, output, uuidReceiving, title, files, imageTypes) {
    $("#chat .message.processing").remove();

    for (let i = 0; i < files.length; i++) {
      let isImage = false;
      for (let j = 0; j < imageTypes.length; j++) {
        if (files[i].endsWith(imageTypes[j])) {
          isImage = true;
        }
      }

      if (isImage) {
        $("#chat").append(`
          <div class="message user file"><img src="/files/${files[i]}"><span class="subtext image">${files[i]}</span></div>
        `);
      }
      else {
        $("#chat").append(`
          <div class="message user file">
            <span class="fileicon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M14 2v6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </span>
            <span class="subtext file">${files[i]}</span>
          </div>
        `);
      }
      const latestFile = $("div.file .fileicon, div.file img").last();
      latestFile.on("click", function() {
        socket.emit("ShowFile", $(this).parent().find(".subtext").text());
      });
    }

    $("#chat").append(`
      <div class="message user">${originalMessage}</div>
    `);
    $("#chat").append(`
      <div class="message">${output}</div>
    `);

    socket.emit("LoadChatData");
    processing = false;
    uuid = uuidReceiving;

    document.title = `ChatBeyond: ${title}`;

    hljs.highlightAll();
    $("#chat a").attr("target", "_blank");

    lenis.stop();
    window.scrollTo({top: document.body.scrollHeight, behavior: "instant"});
    lenis.start();
  });
  socket.on("ChatInProgress", function() {
    $("#chat").show();
    $("#chat").append(`
      <div class="message processing">Thinking and typing...</div>
    `);

    $("#newchatarea").hide(200);
    $("#textinput").val("");
    $("#textinput").css("height", "");
    $("#textinput").css("height", `${$("#textinput")[0].scrollHeight}px`);
    $("#chat").css("padding-bottom", "200px");

    lenis.stop();
    window.scrollTo({top: document.body.scrollHeight, behavior: "instant"});
    lenis.start();
  });
  socket.on("ReloadChatData", function() {
    openNewChat();
    socket.emit("LoadChatData");
  });
  socket.on("UnsupportedType", function(index) {
    fileUpload.splice(index, 1);
    $("#filearea .fileitem").eq(index).remove();
    if ($("#filearea").html().trim() === "") {
      $("#filearea").html("");
    }
    Swal.fire({
      icon: "error",
      title: "Unsupported Type",
      text: "That file type is not supported!",
      confirmButtonColor: "#666666",
      confirmButtonText: "Okay"
    });
  });
  socket.on("UploadComplete", function(uuidName, index) {
    fileUpload[index].uuidName = uuidName;
  });
  socket.on("NotificationAlert", function(title, message, error, clean) {
    if (clean) {
      openNewChat();
    }
    Swal.fire({
      icon: error ? "error" : "success",
      title: title,
      text: message,
      confirmButtonColor: "#666666",
      confirmButtonText: "Okay"
    });
    processing = false;
  });
  socket.on("TokenCost", function(tokenCount, cost) {
    if (cost < 0.01) {
      $("#cost").html(`Estimated Input Cost: Less than $0.01 USD`);
    }
    else {
      $("#cost").html(`Estimated Input Cost: $${formatToMoney(cost)} USD`);
    }
    confetti({
      angle: 90,
      particleCount: 20,
      spread: 180,
      origin: {
        x: 450 / window.innerWidth,
        y: 1
      }
    });
    processing = false;
  })
});
