document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const activitySearch = document.getElementById("activity-search");
  const activitiesCount = document.getElementById("activities-count");
  let activities = {};

  function renderActivities() {
    const query = activitySearch.value.trim().toLocaleLowerCase();
    const visibleActivities = Object.entries(activities).filter(([name, details]) =>
      [name, details.description, details.schedule].some((value) =>
        value.toLocaleLowerCase().includes(query)
      )
    );

    activitiesList.replaceChildren();
    activitiesCount.textContent = query
      ? `${visibleActivities.length} of ${Object.keys(activities).length} activities`
      : `${Object.keys(activities).length} activities`;

    if (visibleActivities.length === 0) {
      const emptyState = document.createElement("p");
      emptyState.className = "empty-state";
      emptyState.textContent = query
        ? "No activities match your search. Try another club, class, or day."
        : "There are no activities to show right now. Check back soon!";
      activitiesList.appendChild(emptyState);
      return;
    }

    visibleActivities.forEach(([name, details]) => {
      const spotsLeft = Math.max(0, details.max_participants - details.participants.length);
      const activityCard = document.createElement("article");
      activityCard.className = "activity-card";

      const title = document.createElement("h3");
      title.textContent = name;

      const availability = document.createElement("span");
      availability.className = `spots-badge${spotsLeft === 0 ? " full" : ""}`;
      availability.textContent = spotsLeft === 0 ? "Fully booked" : `${spotsLeft} spots left`;

      const description = document.createElement("p");
      description.className = "activity-description";
      description.textContent = details.description;

      const schedule = document.createElement("p");
      schedule.className = "activity-schedule";
      const scheduleIcon = document.createElement("span");
      scheduleIcon.setAttribute("aria-hidden", "true");
      scheduleIcon.textContent = "◷";
      schedule.append(scheduleIcon, document.createTextNode(details.schedule));

      activityCard.append(title, availability, description, schedule);
      activitiesList.appendChild(activityCard);
    });
  }

  async function fetchActivities() {
    activitiesList.setAttribute("aria-busy", "true");
    try {
      const response = await fetch("/activities");
      if (!response.ok) {
        throw new Error(`Activity request failed with status ${response.status}`);
      }
      activities = await response.json();
      activitySelect.replaceChildren(new Option("Select an activity", ""));

      Object.entries(activities).forEach(([name, details]) => {
        const spotsLeft = details.max_participants - details.participants.length;
        const option = new Option(name, name, false, false);
        option.disabled = spotsLeft <= 0;
        activitySelect.add(option);
      });

      renderActivities();
    } catch (error) {
      const errorState = document.createElement("p");
      errorState.className = "empty-state";
      errorState.textContent = "We couldn’t load activities. Please refresh the page to try again.";
      activitiesList.replaceChildren(errorState);
      activitiesCount.textContent = "";
      console.error("Error fetching activities:", error);
    } finally {
      activitiesList.setAttribute("aria-busy", "false");
    }
  }

  activitySearch.addEventListener("input", renderActivities);

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const activity = activitySelect.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  fetchActivities();
});
