import {
  addIncident,
  db,
  onSnapshot,
  collection,
  auth,
  provider,
  signInWithPopup,
} from "./firebase.js";

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  loadIncidents();
  
  // Google Sign-In
  document.getElementById('google-signin').addEventListener('click', async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      currentUser = user;

      const userNameElement = document.getElementById('user-name');
      userNameElement.classList.remove('hidden');
      userNameElement.textContent = `${user.displayName.split(' ')[0]}`;
      document.getElementById('auth').classList.add('hidden');
      document.getElementById('auth-section').classList.add('hidden');
      document.getElementById('add-incident-section').classList.remove('hidden');
      document.getElementById('signout').classList.remove('hidden');
      document.getElementById('signout').classList.add('sign-out');
      toastr.success('User signed in successfully!');
    } catch (error) {
      console.error('Error during Google Sign-In:', error);
      toastr.error('Error during Google Sign-In');
    }
  });

  // Sign out
  document.getElementById('signout').addEventListener('click', () => {
    auth.signOut();
    currentUser = null;
    document.getElementById('user-name').classList.add('hidden');
    document.getElementById('signout').classList.add('hidden');
    document.getElementById('signout').classList.remove('sign-out');
    document.getElementById('auth').classList.remove('hidden');
    toastr.success('User signed out successfully!');
  });
});

document.getElementById('filter-category').addEventListener('change', () => {
  loadIncidents();
});

// Navigation functions
document.getElementById('add-incident').addEventListener('click', () => {
  document.getElementById('add-incident-section').classList.remove('hidden');
  document.getElementById('browse-incidents-section').classList.add('hidden');
  document.getElementById('auth-section').classList.add('hidden');
});

document.getElementById('browse-incidents').addEventListener('click', () => {
  document.getElementById('add-incident-section').classList.add('hidden');
  document.getElementById('browse-incidents-section').classList.remove('hidden');
  document.getElementById('auth-section').classList.add('hidden');
  loadIncidents();
});

document.getElementById('auth').addEventListener('click', () => {
  document.getElementById('add-incident-section').classList.add('hidden');
  document.getElementById('browse-incidents-section').classList.add('hidden');
  document.getElementById('auth-section').classList.remove('hidden');
});

const navLinks = document.querySelectorAll('nav a');
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    navLinks.forEach(nav => nav.classList.remove('active'));
    link.classList.add('active');
  });
});

// Add incident to the Firestore
document.getElementById("incident-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) {
    toastr.error("Please sign in to submit an incident.");
    return;
  }

  const title = document.getElementById("title").value;
  const category = document.getElementById("category").value;
  const description = document.getElementById("description").value;
  // const imageFile = document.getElementById("image").files[0];

  const submitButton = e.target.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  // Fetch Geolocation
  if (!navigator.geolocation) {
    toastr.error("Geolocation is not supported by your browser.");
    submitButton.disabled = false;
    submitButton.textContent = "Submit Incident";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      const data = {
        title,
        category,
        description,
        location: { latitude, longitude },
        timestamp: new Date(),
        author: currentUser ? currentUser.displayName : "Anonymous"
      };

      // Save the incident data to Firestore
      // Firestorage cannot be used in this project because it is not free
      await addIncident(data);
      toastr.success("Incident submitted successfully!");

      // Reset form and button
      e.target.reset();
      submitButton.disabled = false;
      submitButton.textContent = "Submit Incident";
    },
    (error) => {
      toastr.error(`Error fetching location: ${error.message}`);
      submitButton.disabled = false;
      submitButton.textContent = "Submit Incident";
    }
  );
});

// Load incidents on dashboard
function loadIncidents() {
  const incidentsContainer = document.getElementById("incidents-container");
  const loader = document.getElementById("loader");
  const selectedCategory = document.getElementById('filter-category').value;

  incidentsContainer.innerHTML = "";
  loader.classList.remove("hidden");

  const incidentsRef = collection(db, "incidents");

  onSnapshot(incidentsRef, (snapshot) => {
    loader.classList.add("hidden");
    if (snapshot.empty) {
      incidentsContainer.innerHTML = "<p>No incidents reported yet.</p>";
      return;
    }

    const incidents = [];
    snapshot.forEach((doc) => {
      const incidentData = doc.data();
      if (selectedCategory === "all" || incidentData.category === selectedCategory) {
        incidents.push(incidentData);
      }
    });

    incidents.sort((a, b) => {
      const dateA = new Date(a.timestamp.seconds * 1000 + (a.timestamp.nanoseconds || 0) / 1000000);
      const dateB = new Date(b.timestamp.seconds * 1000 + (b.timestamp.nanoseconds || 0) / 1000000);
      return dateB - dateA;
    });    

    displayIncidents(incidents);
  });
}

function displayIncidents(incidents) {
  const incidentsContainer = document.getElementById("incidents-container");
  const loader = document.getElementById("loader");

  incidentsContainer.innerHTML = "";
  loader.classList.add("hidden");

  if (incidents.length === 0) {
    incidentsContainer.innerHTML = "<p>No incidents reported yet.</p>";
    return;
  }

  incidents.forEach(async (incident) => {
  
    const incidentCard = await createIncidentCard(incident);
    incidentsContainer.appendChild(incidentCard);
  });
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

async function createIncidentCard(incident) {
  const card = document.createElement("div");
  card.classList.add("incident-card");

  const title = toTitleCase(incident.title || "Untitled Incident");
  const category = incident.category || "Unknown Category";
  const description = incident.description || "No description provided.";
  const imageUrl = incident.imageUrl || null;
  const timestamp = incident.timestamp
    ? new Date(incident.timestamp.seconds * 1000 + incident.timestamp.nanoseconds / 1000000).toLocaleString()
    : "No timestamp.";
  const author = incident.author || "Anonymous";

  let location = "Location not available.";
  if (incident.location) {
  
    try {
      location = await getAddressFromCoordinates(incident.location.latitude, incident.location.longitude);
    
    } catch (error) {
      console.error("Error getting address:", error);
    }
  } else {
    console.warn("No location field in incident data");
  }

  const maxLength = 100;
  const truncatedDescription = description.length > maxLength
    ? description.substring(0, maxLength) + '...'
    : description;

  card.innerHTML = `
    <h3>${title}</h3>
    <p class="category"><strong>Category:</strong> ${category}</p>
    <p class="description">
      <span class="truncated">${truncatedDescription}</span>
      <span class="full" style="display: none;">${description}</span>
      ${description.length > maxLength ? `<a href="#" class="read-more">Read more</a>` : ''}
    </p>
    <p><img src='img/location-dot.svg' alt='location icon' class='icon' /> ${location}</p>
    <p class="timestamp">${timestamp}</p>
    <p class='author'>${author}</p>
    ${imageUrl ? `<img src="${imageUrl}" alt="${title}" />` : ""}
  `;

  if (description.length > maxLength) {
    const readMoreLink = card.querySelector('.read-more');
    const truncatedSpan = card.querySelector('.truncated');
    const fullSpan = card.querySelector('.full');

    readMoreLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (readMoreLink.textContent === 'Read more') {
        truncatedSpan.style.display = 'none';
        fullSpan.style.display = 'inline';
        readMoreLink.textContent = 'Read less';
      } else {
        truncatedSpan.style.display = 'inline';
        fullSpan.style.display = 'none';
        readMoreLink.textContent = 'Read more';
      }
    });
  }

  return card;
}

async function getAddressFromCoordinates(latitude, longitude) {
  const apiKey = 'AIzaSyATs1u-mGSo4jZvD4wmulPitvPVbR0rNzc';
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
  const data = await response.json();

  if (data.status === 'OK' && data.results.length > 0) {
    return data.results[0].formatted_address;
  } else {
    throw new Error('Unable to get address from coordinates');
  }
}
