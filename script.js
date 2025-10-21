let map, directionsService, directionsRenderer;
const waypoints = [];
const markers = [];

window.initMap = function() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 45.5017, lng: -73.5673 },
    zoom: 10
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ map });

  // Autocomplete sur input classique
  const startInput = document.getElementById("start");
  const waypointInput = document.getElementById("waypoint");

  new google.maps.places.Autocomplete(startInput, { componentRestrictions: { country: "ca" } });
  new google.maps.places.Autocomplete(waypointInput, { componentRestrictions: { country: "ca" } });
};


// ✅ Nouvelle méthode pour créer un marqueur avec AdvancedMarkerElement
async function addMarker(address, color = "red") {
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address }, (results, status) => {
    if (status === "OK" && results[0]) {
      const position = results[0].geometry.location;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        title: address,
      });

      // Ajout d’un style personnalisé (cercle coloré)
      const pin = new google.maps.marker.PinElement({
        background: color,
        borderColor: "#333",
        glyphColor: "white",
      });
      marker.content = pin.element;

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

// Bouton "Ajouter"
document.getElementById("add").onclick = () => {
  const addr = document.getElementById("waypoint").value.trim();
  if (addr) {
    waypoints.push({ location: addr });
    addMarker(addr, "blue");
    refreshWaypointsList();
    document.getElementById("waypoint").value = "";
  }
};

// Bouton "Calculer la route"
document.getElementById("calc").onclick = () => {
  const origin = document.getElementById("start").value.trim();
  if (!origin || waypoints.length === 0)
    return alert("Ajoute une adresse de départ et au moins une étape !");

  directionsRenderer.setDirections({ routes: [] });
  markers.forEach((m) => (m.map = null));
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
