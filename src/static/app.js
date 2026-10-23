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

      const participantsSection = document.createElement("section");
      participantsSection.className = "activity-participants";
      participantsSection.setAttribute("aria-label", `Participants for ${name}`);

      const participantsHeading = document.createElement("h4");
      participantsHeading.textContent = "Participants";

      const participantsList = document.createElement("ul");
      participantsList.className = "participants-list";
      if (details.participants.length > 0) {
        details.participants.forEach((participant) => {
          const participantItem = document.createElement("li");
          participantItem.className = "participant-item";

          const participantEmail = document.createElement("span");
          participantEmail.className = "participant-email";
          participantEmail.textContent = participant;

          const removeButton = document.createElement("button");
          removeButton.className = "remove-participant";
          removeButton.type = "button";
          removeButton.setAttribute("aria-label", `Remove ${participant} from ${name}`);
          removeButton.title = "Unregister participant";
          removeButton.innerHTML =
            '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 4h10M6 4V2.75h4V4m2 0-.6 9H4.6L4 4m2.5 2v4.5m3-4.5v4.5" /></svg>';

          participantItem.append(participantEmail, removeButton);
          participantsList.appendChild(participantItem);
        });
      } else {
        const emptyParticipants = document.createElement("li");
        emptyParticipants.className = "participants-empty";
        emptyParticipants.textContent = "No one has signed up yet";
        participantsList.appendChild(emptyParticipants);
      }

      participantsSection.append(participantsHeading, participantsList);
      activityCard.append(title, availability, description, schedule, participantsSection);
      activitiesList.appendChild(activityCard);
    });

    activitiesList.querySelectorAll(".remove-participant").forEach((button) => {
      button.addEventListener("click", async () => {
        const participantItem = button.closest(".participant-item");
        const activityCard = button.closest(".activity-card");
        const email = participantItem.querySelector(".participant-email").textContent;
        const activity = activityCard.querySelector("h3").textContent;
        button.disabled = true;

        try {
          const response = await fetch(
            `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
            { method: "DELETE" }
          );
          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.detail || "Could not unregister participant");
          }

          messageDiv.textContent = result.message;
          messageDiv.className = "message success";
          messageDiv.classList.remove("hidden");
          await fetchActivities();
        } catch (error) {
          messageDiv.textContent = error.message || "Could not unregister participant. Please try again.";
          messageDiv.className = "message error";
          messageDiv.classList.remove("hidden");
          button.disabled = false;
          console.error("Error unregistering participant:", error);
        }

        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 5000);
      });
    });
  }

  async function fetchActivities() {
    activitiesList.setAttribute("aria-busy", "true");
    try {
      const response = await fetch("/activities", { cache: "no-store" });
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
