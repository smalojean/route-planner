let map, directionsService, directionsRenderer;
const waypoints = [];
const markers = [];
let geocoder, autocompleteStart, autocompleteWaypoint;

window.initMap = function () {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 45.5017, lng: -73.5673 },
    zoom: 10,
  });

  geocoder = new google.maps.Geocoder();
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ map });

  const options = {
    fields: ["formatted_address", "geometry", "name"],
    componentRestrictions: { country: "ca" },
  };

  autocompleteStart = new google.maps.places.Autocomplete(
    document.getElementById("start"),
    options
  );
  autocompleteWaypoint = new google.maps.places.Autocomplete(
    document.getElementById("waypoint"),
    options
  );
};

function addMarker(address, color = "red") {
  geocoder.geocode({ address }, (results, status) => {
    if (status === "OK") {
      const position = results[0].geometry.location;
      const marker = new google.maps.Marker({
        map,
        position,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: color,
          fillOpacity: 1,
          strokeWeight: 1,
          strokeColor: "#333",
        },
      });
      markers.push(marker);
      map.setCenter(position);
    } else {
      alert("Adresse non trouvée : " + address);
    }
  });
}

function refreshWaypointsList() {
  const list = document.getElementById("waypointsList");
  list.innerHTML = "";
  waypoints.forEach((wp, index) => {
    const li = document.createElement("li");
    li.draggable = true;
    li.dataset.index = index;
    li.innerHTML = `
      <span>${wp.location}</span>
      <button class="remove" data-index="${index}">Supprimer</button>
    `;
    list.appendChild(li);
  });

  document.querySelectorAll(".remove").forEach((btn) => {
    btn.onclick = () => {
      const i = btn.dataset.index;
      waypoints.splice(i, 1);
      refreshWaypointsList();
    };
  });

  enableDragAndDrop();
}

function enableDragAndDrop() {
  const list = document.getElementById("waypointsList");
  let draggedItem = null;

  list.querySelectorAll("li").forEach((li) => {
    li.addEventListener("dragstart", () => {
      draggedItem = li;
      li.classList.add("dragging");
    });
    li.addEventListener("dragend", () => {
      li.classList.remove("dragging");
      draggedItem = null;
    });
    li.addEventListener("dragover", (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(list, e.clientY);
      if (afterElement == null) {
        list.appendChild(draggedItem);
      } else {
        list.insertBefore(draggedItem, afterElement);
      }
    });
  });

  list.addEventListener("drop", () => {
    const newOrder = Array.from(list.querySelectorAll("li")).map((li) =>
      li.querySelector("span").textContent
    );
    waypoints.length = 0;
    newOrder.forEach((addr) => waypoints.push({ location: addr }));
    refreshWaypointsList();
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll("li:not(.dragging)")];
  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

document.getElementById("add").onclick = () => {
  const addr = document.getElementById("waypoint").value.trim();
  if (addr) {
    waypoints.push({ location: addr });
    addMarker(addr, "blue");
    refreshWaypointsList();
    document.getElementById("waypoint").value = "";
  }
};

document.getElementById("calc").onclick = () => {
  const origin = document.getElementById("start").value.trim();
  if (!origin || waypoints.length === 0)
    return alert("Ajoute une adresse de départ et au moins une étape !");

  directionsRenderer.setDirections({ routes: [] });
  markers.forEach((m) => m.setMap(null));
  markers.length = 0;
  addMarker(origin, "green");

  directionsService.route(
    {
      origin,
      destination: origin,
      waypoints,
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false,
    },
    (res, status) => {
      if (status === "OK") {
        directionsRenderer.setDirections(res);
      } else {
        alert("Erreur : " + status);
      }
    }
  );
};
