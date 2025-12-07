document.addEventListener("DOMContentLoaded", function () {
    const API_BASE = "http://localhost:3500"; 

    // --- 1. SESSION CHECK & REDIRECT ---
    if (sessionStorage.getItem("token")) {
        window.location.href = "courses.html";
        return;
    }
    
    // --- 2. DOM ELEMENT REFERENCES ---

    // LOGIN MODAL Elements
    const loginRoleSelect = document.getElementById("loginRoleSelect");
    const teacherLoginForm = document.getElementById("teacherLoginForm");
    const studentLoginForm = document.getElementById("studentLoginForm");
    const studentLoginYearSelect = document.getElementById("studentLoginYearSelect");
    const studentLoginSemSelect = document.getElementById("studentLoginSemSelect");
    const loginBtns = document.querySelectorAll(".loginSubmitBtn");

    // SIGNUP MODAL Elements
    const signupRoleSelect = document.getElementById("signupRoleSelect");
    const teacherSignupForm = document.getElementById("teacherSignupForm");
    const studentSignupForm = document.getElementById("studentSignupForm");
    const studentSignupYearSelect = document.getElementById("studentSignupYearSelect");
    const studentSignupSemSelect = document.getElementById("studentSignupSemSelect");
    const signupBtns = document.querySelectorAll(".signupSubmitBtn");


    // --- 3. MODAL ROLE TOGGLE LOGIC ---

    // Login Modal Role Switch (Teacher/Student form visibility)
    if (loginRoleSelect) {
        loginRoleSelect.addEventListener("change", function() {
            teacherLoginForm.style.display = "none";
            studentLoginForm.style.display = "none";
            if (this.value === "teacher") {
                teacherLoginForm.style.display = "block";
            } else if (this.value === "student") {
                studentLoginForm.style.display = "block";
                // Hide semester initially when student is selected
                studentLoginSemSelect.style.display = "none"; 
            }
        });
    }

    // Login Modal Student Year/Semester Toggle
    if (studentLoginYearSelect) {
        studentLoginYearSelect.addEventListener("change", function() {
            if (this.value === "iv") {
                studentLoginSemSelect.style.display = "block";
            } else {
                studentLoginSemSelect.style.display = "none";
            }
        });
    }

    // Signup Modal Role Switch (Teacher/Student form visibility)
    if (signupRoleSelect) {
        signupRoleSelect.addEventListener("change", function() {
            teacherSignupForm.style.display = "none";
            studentSignupForm.style.display = "none";
            if (this.value === "teacher") {
                teacherSignupForm.style.display = "block";
            } else if (this.value === "student") {
                studentSignupForm.style.display = "block";
                 // Hide semester initially when student is selected
                studentSignupSemSelect.style.display = "none"; 
            }
        });
    }

    // Signup Modal Student Year/Semester Toggle
    if (studentSignupYearSelect) {
        studentSignupYearSelect.addEventListener("change", function() {
            if (this.value === "iv") {
                studentSignupSemSelect.style.display = "block";
            } else {
                studentSignupSemSelect.style.display = "none";
            }
        });
    }

    // --- 4. SIGNUP SUBMIT HANDLER ---

    if (signupBtns.length > 0) {
        signupBtns.forEach(function (btn) {
            btn.addEventListener("click", async function (e) {
                e.preventDefault();
                const form = btn.closest("form");
                if (!form) return;
                
                let formData = {};
                let role;
                
                // Determine role and gather data
                if (form === teacherSignupForm) {
                    role = "teacher";
                    formData = {
                        role: role,
                        department: document.getElementById("teacherSignupDepSelect").value,
                        name: teacherSignupForm.querySelector('input[name="name"]').value,
                        email: teacherSignupForm.querySelector('input[name="email"]').value,
                        password: teacherSignupForm.querySelector('input[name="password"]').value
                    };
                } else if (form === studentSignupForm) {
                    role = "student";
                    formData = {
                        role: role,
                        department: document.getElementById("studentSignupDepSelect").value,
                        year: document.getElementById("studentSignupYearSelect").value,
                        semester: document.getElementById("studentSignupSemSelect").value,
                        name: studentSignupForm.querySelector('input[name="name"]').value,
                        email: studentSignupForm.querySelector('input[name="email"]').value,
                        password: studentSignupForm.querySelector('input[name="password"]').value
                    };
                }

                // Validation Check (Ensures Department, Year, and Semester are selected)
                if (!formData.department) {
                    return alert("Please select a valid department.");
                }
                if (role === "student" && !formData.year) {
                    return alert("Please select a valid year.");
                }
                if (role === "student" && formData.year === "iv" && !formData.semester) {
                    return alert("Please select a valid semester for Year IV.");
                }
                
                // API Call
                try {
                    const res = await fetch(`${API_BASE}/signup`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(formData)
                    });
                    
                    const data = await res.json();

                    if (res.ok) {
                        sessionStorage.setItem("token", data.token);
                        sessionStorage.setItem("role", data.user.role);
                        sessionStorage.setItem("teacherName", data.user.name); // Stores name for both roles

                        window.location.href = "courses.html";
                    } else {
                        alert(`Signup Failed: ${data.msg || "An unexpected error occurred."}`);
                    }
                } catch (err) {
                    console.error("Signup Network Error:", err);
                    alert("Network Error: Could not connect to the server.");
                }
            });
        });
    }


    // --- 5. LOGIN SUBMIT HANDLER ---

    if (loginBtns.length > 0) {
        loginBtns.forEach(function (btn) {
            btn.addEventListener("click", async function (e) {
                e.preventDefault();
                const form = btn.closest("form");
                if (!form) return;

                let role = form.id.includes("teacher") ? "teacher" : "student";
                
                // Collect input data (assuming the 'name' attribute is only on name, email, and password inputs)
                const nameInput = form.querySelector('input[name="name"]');
                const emailInput = form.querySelector('input[name="email"]');
                const passwordInput = form.querySelector('input[name="password"]');

                if (!nameInput || !emailInput || !passwordInput) {
                    return alert("Form data is incomplete.");
                }
                
                const loginData = {
                    name: nameInput.value,
                    email: emailInput.value,
                    password: passwordInput.value,
                    role: role
                };
                
                // No complex client-side validation needed beyond filling fields, as server handles credentials
                
                try {
                    const res = await fetch(`${API_BASE}/login`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(loginData)
                    });

                    const data = await res.json();

                    if (res.ok) {
                        sessionStorage.setItem("token", data.token);
                        sessionStorage.setItem("role", data.user.role);
                        sessionStorage.setItem("teacherName", data.user.name); // Stores name for both roles
                        
                        alert("Login successful! Redirecting to courses...");
                        window.location.href = "courses.html";
                    } else {
                        alert(`Login Failed: ${data.msg || "Invalid credentials or server error."}`);
                    }
                } catch (err) {
                    console.error("Login Network Error:", err);
                    alert("Network Error: Could not connect to the server.");
                }
            });
        });
    }
});