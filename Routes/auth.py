from flask import Blueprint, render_template, request, redirect, url_for, session, flash
from supabase_client import supabase  # Uses the shared client from supabase_client.py

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")

        try:
            # 1. Authenticate credentials with Supabase
            auth_res = supabase.auth.sign_in_with_password({"email": email, "password": password})
            user_id = auth_res.user.id

            # 2. Check user role in profiles table
            profile_res = supabase.table("profiles").select("role, full_name").eq("id", user_id).single().execute()
            role = profile_res.data.get("role") if profile_res.data else None

            if role in ["admin", "owner"]:
                session["user_id"] = user_id
                session["user_email"] = email
                session["user_role"] = role
                session["full_name"] = profile_res.data.get("full_name", "Admin User")
                return redirect(url_for("dashboard.index"))
            else:
                flash("Access denied. You must be an Admin or Restaurant Owner.", "error")

        except Exception as e:
            flash(f"Login failed: {str(e)}", "error")

    return render_template("login.html")

@auth_bp.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("auth.login"))