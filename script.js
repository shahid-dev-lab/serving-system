const SUPABASE_URL = "https://krnhurngvymxnkvbzfwo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtybmh1cm5ndnlteG5rdmJ6ZndvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjM3NzAsImV4cCI6MjA3Njg5OTc3MH0.1WF7aFmdGypKtjMSFE-6m8qguspt8x0IvjWmFbD4cvY";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (document.getElementById("memberForm")) {
  setupAdminPage();
} else if (document.getElementById("memberSelect")) {
  setupSeetPage();
}

// ================= ADMIN PAGE =================
async function setupAdminPage() {
  const form = document.getElementById("memberForm");
  const memberInput = document.getElementById("memberName");
  const listDiv = document.getElementById("memberList");
  const nextBtn = document.getElementById("nextBtn");

  await loadMembers();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = memberInput.value.trim();
    if (!name) return alert("Enter a name");

    const { error } = await supabaseClient.from("members").insert([
      { name: name, seet_number: null, revealed: false },
    ]);
    if (error) return alert("Error adding member: " + error.message);

    memberInput.value = "";
    await loadMembers();
  });

  async function loadMembers() {
    const { data, error } = await supabaseClient
      .from("members")
      .select("*")
      .order("id", { ascending: true });
    if (error) return console.error(error);

    listDiv.innerHTML =
      "<h3>Current Members:</h3>" +
      data.map((m) => `<p>${m.name}</p>`).join("");
  }

  nextBtn.onclick = () => {
    window.location.href = "seet.html";
  };
}

// ================= SEET PAGE =================
async function setupSeetPage() {
  const memberSelect = document.getElementById("memberSelect");
  const container = document.getElementById("seetContainer");
  const resultArea = document.getElementById("resultArea");
  const memberStatus = document.getElementById("memberStatus");

  // Load members into dropdown
  const { data: members } = await supabaseClient
    .from("members")
    .select("*")
    .order("id", { ascending: true });

  members.forEach((m) => {
    const option = document.createElement("option");
    option.value = m.id;
    option.text = m.name;
    memberSelect.appendChild(option);
  });

  // Load initial status
  await loadMemberStatus();

  // On member selected
  memberSelect.addEventListener("change", async () => {
    container.innerHTML = "";
    resultArea.innerHTML = "";

    const memberId = memberSelect.value;
    if (!memberId) return;

    // Get selected member
    const { data: member } = await supabaseClient
      .from("members")
      .select("*")
      .eq("id", memberId)
      .single();

    // If already selected, show result
    if (member.seet_number) {
      resultArea.innerHTML = `<h3>${member.name} → Seet #${member.seet_number}</h3>`;
      return;
    }

    // Create clickable seats **2–16 only**
    for (let i = 2; i <= 15; i++) {
      const div = document.createElement("div");
      div.className = "seet";
      div.innerText = "?";

      div.onclick = async () => {
        if (div.classList.contains("revealed")) return;

        // Fetch taken seats
        const { data: takenNumbers } = await supabaseClient
          .from("members")
          .select("seet_number")
          .not("seet_number", "is", null);

        const taken = takenNumbers.map((n) => n.seet_number);

        // Only available seats 2–16
        const available = [];
        for (let n = 2; n <= 15; n++) {
          if (!taken.includes(n)) available.push(n);
        }

        if (available.length === 0) {
          alert("All seet numbers are taken!");
          return;
        }

        // Random pick
        const randomIndex = Math.floor(Math.random() * available.length);
        const randomNumber = available[randomIndex];

        // Reveal UI
        div.innerText = randomNumber;
        div.classList.add("revealed", "pop-animation");

        // Save to DB
        await supabaseClient
          .from("members")
          .update({ seet_number: randomNumber, revealed: true })
          .eq("id", memberId);

        // Show congratulations message
        resultArea.innerHTML = `<h3 class="congrats">🎉 Congrats ${member.name}! You got Seet #${randomNumber}</h3>`;

        // Confetti
        confettiAnimation();
        await loadMemberStatus();

        // Disable other cards
        Array.from(container.children).forEach(
          (c) => (c.style.pointerEvents = "none")
        );
      };

      container.appendChild(div);
    }
  });

  async function loadMemberStatus() {
    const { data: allMembers } = await supabaseClient
      .from("members")
      .select("*")
      .order("id", { ascending: true });

    memberStatus.innerHTML = allMembers
      .map((m) => {
        return `<p>👤 <strong>${m.name}</strong> — ${
          m.seet_number ? `Seet #${m.seet_number}` : `<em>Not selected</em>`
        }</p>`;
      })
      .join("");
  }

  // Confetti effect
  function confettiAnimation() {
    const duration = 2000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });

      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }
}

