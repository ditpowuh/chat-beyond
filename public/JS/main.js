const socket = io();

let uuid = "";
let processing = false;

$("#textinput").css("height", `${$("#textinput")[0].scrollHeight - 32}px`);
$("#bottomarea").css("opacity", "1");
$("#textinput").on("input", function() {
  $(this).css("height", "");
  $(this).css("height", `${this.scrollHeight - 32}px`);
  $("#chat").css("padding-bottom", `${175 + (this.offsetHeight - 84)}px`);
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
  $("#textinput").css("height", `${$("#textinput")[0].scrollHeight - 32}px`);
  $("#chat").css("padding-bottom", "175px");

  $("#newchatarea .message").hide(200);
  $("#chatname").val("");

  $("#chat").empty();

  uuid = "";
}

function openSettings() {
  document.title = "ChatBeyond: Settings";
  $("#settings").show(200);
  $("#bottomarea").hide(200);
  $("#newchatarea").hide(200);
  $("#chat").hide(200);
  socket.emit("LoadSettings");

  window.scrollTo({top: 0, behavior: "instant"});
}

function openExistingChat(uuidChat) {
  $("#settings").hide(200);
  $("#bottomarea").show(200);
  $("#newchatarea").hide(200);
  $("#chat").show(200);

  $("#textinput").val("");
  $("#textinput").css("height", "");
  $("#textinput").css("height", ($("#textinput")[0].scrollHeight - 32) + "px");
  $("#chat").css("padding-bottom", "175px");
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

$("#sendbutton").on("click", function() {
  if (processing) {
    return;
  }
  if ($("#chatname").val() === "" && uuid === "") {
    Swal.fire({
      icon: "error",
      title: "No chat name",
      text: "Please put a name for your new conversation."
    });
    return;
  }
  if ($("#textinput").val() === "") {
    Swal.fire({
      icon: "error",
      title: "Cannot send empty message",
      text: "Please put your message to send."
    });
    return;
  }
  processing = true;

  socket.emit("SendMessage", $("#textinput").val(), uuid !== "" ? uuid : $("#chatname").val());
});

$("#costbutton").on("click", function() {
  if (processing) {
    return;
  }
  if ($("#textinput").val() === "") {
    Swal.fire({
      icon: "error",
      title: "Cannot calculate",
      text: "Please put your message to calculate."
    });
    return;
  }
  processing = true;
  $("#cost").html(`Estimated Input Cost: Calculating...`);
  socket.emit("CalculateCost", $("#textinput").val(), uuid);
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
        $(latestListAdded).append(`
          <li data-uuid="${chats[category][i]["uuid"]}">${chats[category][i]["title"]}</li>
        `);
      }
    }
    $("#pastchats .list li").on("click", function() {
      if (processing) {
        return;
      }
      document.title = "ChatBeyond: " + $(this).html();
      openExistingChat($(this).data("uuid"));
    });
  });
  socket.on("LoadMessages", function(messages) {
    $("#chat").empty();
    for (let i = 0; i < messages.length; i++) {
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
    window.scrollTo({top: document.body.scrollHeight, behavior: "instant"});
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
    }
    else if (settings.theme === "DARK") {
      $("#theme").attr("href", "/CSS/dark.css");
      $("#settingsicon").attr("src", "/Assets/SettingsWhite.svg");
      $("#logo").attr("src", "/Assets/LogoWhite.png");
      $("#codestyling").attr("href", "https://unpkg.com/@highlightjs/cdn-assets@11.11.1/styles/atom-one-dark.min.css");
    }
  });
  socket.on("NewMessage", function(originalMessage, output, uuidReceiving) {
    $("#chat .message.processing").remove();
    $("#chat").append(`
      <div class="message user">${originalMessage}</div>
    `);
    $("#chat").append(`
      <div class="message">${output}</div>
    `);

    socket.emit("LoadChatData");
    processing = false;
    uuid = uuidReceiving;

    hljs.highlightAll();
    window.scrollTo({top: document.body.scrollHeight, behavior: "instant"});
  });
  socket.on("ChatInProgress", function() {
    $("#chat").show(200);
    $("#chat").append(`
      <div class="message processing">Thinking and typing...</div>
    `)

    $("#newchatarea").hide(200);
    $("#textinput").val("");
    $("#textinput").css("height", "");
    $("#textinput").css("height", `${$("#textinput")[0].scrollHeight - 32}px`);
    $("#chat").css("padding-bottom", "175px");

    window.scrollTo({top: document.body.scrollHeight, behavior: "instant"});
  });
  socket.on("Problem", function(title, message, clean) {
    if (clean) {
      openNewChat();
    }
    Swal.fire({
      icon: "error",
      title: title,
      text: message
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
        x: 400 / window.innerWidth,
        y: 1
      }
    });
    processing = false;
  })
});
