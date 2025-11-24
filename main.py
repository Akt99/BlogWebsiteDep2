from datetime import date
from datetime import datetime
import os
from functools import wraps
from hashlib import md5
from dotenv import load_dotenv
from flask import (
    Flask, abort, render_template, redirect, url_for, flash, request,
    jsonify, send_from_directory
)
from flask_bootstrap import Bootstrap5
from flask_ckeditor import CKEditor
from flask_gravatar import Gravatar
from flask_login import (
    UserMixin, login_user, LoginManager, current_user, logout_user, login_required
)
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import relationship, DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Integer, String, Text, Boolean, text
from sqlalchemy import inspect as sa_inspect
from werkzeug.security import generate_password_hash, check_password_hash
from flask_wtf import CSRFProtect
# Optional: from flask_cors import CORS  # only needed if FE/BE are on different domains
from forms import CreatePostForm, RegisterForm, LoginForm, CommentForm

# -----------------------------
# Env & App Setup
# -----------------------------
load_dotenv()

# If you plan to serve React build from Flask in production, keep static_folder below.
# If not, you can use: app = Flask(__name__)
app = Flask(__name__, static_folder="frontend/dist", static_url_path="/")

# Load secret key from env (supports FLASK_KEY or SECRET_KEY)
_secret = os.environ.get("FLASK_KEY") or os.environ.get("SECRET_KEY")
if not _secret:
    raise RuntimeError("Set FLASK_KEY or SECRET_KEY in your .env (use a long random string).")
app.config["SECRET_KEY"] = _secret

# Cookie/security toggles (tune for prod)
# If FE/BE are on SAME origin: Lax is fine.
# If FE on Vercel and BE on Render (cross-site): set None + Secure=True.
app.config.setdefault("SESSION_COOKIE_SAMESITE", "Lax")
app.config.setdefault("SESSION_COOKIE_SECURE", False)  # True when behind HTTPS in production

# Database URL (SQLite default)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DB_URI", "sqlite:///posts.db")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

ckeditor = CKEditor(app)
Bootstrap5(app)
csrf = CSRFProtect(app)
# If splitting FE/BE across domains, uncomment and set origins:
# CORS(app, supports_credentials=True, origins=[os.environ.get("CORS_ORIGINS", "")])

print("SECRET_KEY loaded?", bool(app.config["SECRET_KEY"]))

# -----------------------------
# Login Manager
# -----------------------------
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"  # redirect unauthenticated users here

# -----------------------------
# DB Models
# -----------------------------
class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
db.init_app(app)

class ContactMessage(db.Model):
    __tablename__ = "contact_messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    date: Mapped[str] = mapped_column(String(50), nullable=False)

class BlogPost(db.Model):
    __tablename__ = "blog_posts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    author_id: Mapped[int] = mapped_column(Integer, db.ForeignKey("users.id"))
    author = relationship("User", back_populates="posts")
    title: Mapped[str] = mapped_column(String(250), unique=True, nullable=False)
    subtitle: Mapped[str] = mapped_column(String(250), nullable=False)
    date: Mapped[str] = mapped_column(String(250), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    img_url: Mapped[str] = mapped_column(String(250), nullable=False)
    pinned: Mapped[bool]= mapped_column(Boolean, default=False, nullable=False)
    comments = relationship("Comment", back_populates="parent_post")

class User(UserMixin, db.Model):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(100), unique=True)
    password: Mapped[str] = mapped_column(String(100))
    name: Mapped[str] = mapped_column(String(100))
    posts = relationship("BlogPost", back_populates="author")
    comments = relationship("Comment", back_populates="comment_author")

class Comment(db.Model):
    __tablename__ = "comments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    author_id: Mapped[int] = mapped_column(Integer, db.ForeignKey("users.id"))
    comment_author = relationship("User", back_populates="comments")
    post_id: Mapped[str] = mapped_column(Integer, db.ForeignKey("blog_posts.id"))
    parent_post = relationship("BlogPost", back_populates="comments")

with app.app_context():
    db.create_all()
    insp = sa_inspect(db.engine)
    cols = [c['name'] for c in insp.get_columns('blog_posts')]
    if 'pinned' not in cols:
        db.session.execute(text('ALTER TABLE blog_posts ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT 0'))
        db.session.commit()

@login_manager.user_loader
def load_user(user_id):
    return db.get_or_404(User, user_id)

# Gravatar for comments
gravatar = Gravatar(app, size=100, rating='g', default='retro',
                    force_default=False, force_lower=False, use_ssl=False, base_url=None)

# -----------------------------
# Helpers / Decorators
# -----------------------------
def admin_only(f):
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        # Only allow admin (user id == 1)
        if not is_admin_user(current_user):
            return abort(403)
        return f(*args, **kwargs)
    return decorated_function

ADMIN_EMAIL = (os.environ.get("ADMIN_EMAIL") or "").lower()

def is_admin_user(u):
    if not u or not u.is_authenticated:
        return False
    if u.id == 1:
        return True
    return ADMIN_EMAIL and u.email.lower() == ADMIN_EMAIL

def gravatar_url(email: str | None, size: int = 80, default: str = "retro") -> str:
    if not email:
        return f"https://www.gravatar.com/avatar/?d={default}&s={size}"
    h = md5(email.strip().lower().encode("utf-8")).hexdigest()
    return f"https://www.gravatar.com/avatar/{h}?d={default}&s={size}"

def serialize_comment(c: Comment) -> dict:
    name=c.comment_author.name if c.comment_author else "Anonymous"
    return {
        "id": c.id,
        "text": c.text,
        "author": name,
        "author_name": c.comment_author.name if c.comment_author else "Anonymous",
        "avatar": gravatar_url(getattr(c.comment_author, "email", None), 48),
    }

def serialize_post(p: BlogPost, with_body: bool = False, with_comments: bool = False) -> dict:
    data = {
        "id": p.id,
        "title": p.title,
        "subtitle": p.subtitle,
        "date": p.date,
        "img_url": p.img_url,
        # keep if you later add a pinned column; harmless if absent:
        "pinned": getattr(p, "pinned", False),
    }
    if with_body:
        data["body"] = p.body
    if with_comments:
        data["comments"] = [serialize_comment(c) for c in p.comments]
    return data


# -----------------------------
# CSRF Token for SPA (React)
# -----------------------------
@app.get("/api/csrf-token")
def csrf_token():
    from flask_wtf.csrf import generate_csrf
    token = generate_csrf()
    resp = app.make_response({"ok": True})
    # SameSite/secure must match your deployment shape (see SESSION_COOKIE_* above)
    resp.set_cookie("csrf_token", token, samesite=app.config["SESSION_COOKIE_SAMESITE"],
                    secure=app.config["SESSION_COOKIE_SECURE"])
    return resp

# -----------------------------
# JSON API Endpoints (for React)
# -----------------------------
@app.get("/api/posts")
def api_posts():
    result = db.session.execute(db.select(BlogPost).order_by(BlogPost.pinned.desc(),BlogPost.id.desc()))
    posts = result.scalars().all()
    return jsonify([{
        "id": p.id, "title": p.title, "subtitle": p.subtitle,
        "date": p.date, "img_url": p.img_url,
        "author": p.author.name if p.author else None,
        "pinned": bool(p.pinned),
    } for p in posts])

@app.get("/api/posts/<int:pid>")
def api_post(pid):
    p = db.get_or_404(BlogPost, pid)
    return jsonify(serialize_post(p, with_body=True, with_comments=True))
#({
#        "id": p.id, "title": p.title, "subtitle": p.subtitle,
#        "date": p.date, "img_url": p.img_url, "body": p.body,
#        "author": p.author.name if p.author else None,
#        "pinned": bool(p.pinned),
#        "comments": [{"id": c.id, "text": c.text,
#                      "author": c.comment_author.name if c.comment_author else None} for c in p.comments]
#        (serialize_post(p, with_body=True, with_comments=True
#    })
@app.patch("/api/posts/<int:pid>/pin")
@admin_only
def api_pin_post(pid):
    p = db.get_or_404(BlogPost, pid)
    data = request.get_json() or {}
    # if "pinned" provided, set it; else toggle
    if "pinned" in data:
        p.pinned = bool(data["pinned"])
    else:
        p.pinned = not bool(p.pinned)
    db.session.commit()
    return {"ok": True, "pinned": bool(p.pinned)}

@app.delete("/api/posts/<int:pid>")
@admin_only
def api_delete_post(pid):
    p = db.get_or_404(BlogPost, pid)
    db.session.delete(p)
    db.session.commit()
    return {"ok": True}

@app.delete("/api/comments/<int:cid>")
@login_required
def api_delete_comment(cid):
    c = db.get_or_404(Comment, cid)

    # Only admin or post owner can delete
    if not (is_admin_user(current_user) or c.parent_post.author_id == current_user.id):
        return {"error": "Forbidden"}, 403

    db.session.delete(c)
    db.session.commit()
    return {"ok": True}

@app.post("/api/posts/<int:pid>/comments")
@login_required
def api_add_comment(pid):
    post = db.get_or_404(BlogPost, pid)
    data = request.get_json() or {}
    text = (data.get("text") or "").strip()
    if not text:
        return {"message":"Comment text required"}, 400
    comment = Comment(text=text, comment_author=current_user, parent_post=post)
    db.session.add(comment); db.session.commit()
    return jsonify(serialize_comment(comment)),201

@app.post("/api/register")
def api_register():
    data = request.get_json() or {}
    email = (data.get("email") or "").lower().strip()
    name = (data.get("name") or "").strip()
    password = data.get("password") or ""
    if not (email and name and password):
        return jsonify({"error": "Missing fields"}), 400
    if db.session.execute(db.select(User).where(User.email == email)).scalar():
        return jsonify({"error": "Email already registered"}), 400
    hashed = generate_password_hash(password, method='pbkdf2:sha256', salt_length=8)
    user = User(email=email, name=name, password=hashed)
    db.session.add(user); db.session.commit()
    login_user(user)
    return jsonify({"ok": True})

@app.post("/api/login")
def api_login():
    data = request.get_json() or {}
    email = (data.get("email") or "").lower().strip()
    password = data.get("password") or ""

    user = db.session.execute(db.select(User).where(User.email == email)).scalar()
    if not user or not check_password_hash(user.password, password):
        return jsonify({"error": "Invalid credentials"}), 401
    login_user(user)
    return jsonify({"ok": True})

@app.post("/api/logout")
def api_logout():
    logout_user()
    return jsonify({"ok": True})

@app.post("/api/posts")
@login_required
def api_create_post():
    data = request.get_json() or {}
    required = ("title", "subtitle", "body", "img_url")
    if not all(k in data and data[k] for k in required):
        return jsonify({"error": "Missing fields"}), 400
    p = BlogPost(
        title=data["title"], subtitle=data["subtitle"], body=data["body"],
        img_url=data["img_url"], author=current_user,
        date=date.today().strftime("%B %d, %Y")
    )
    db.session.add(p); db.session.commit()
    return jsonify({"id": p.id})

@app.post("/api/contact")
def api_contact():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    message = (data.get("message") or "").strip()
    if not (name and email and message):
        return {"error":"All fields required"}, 400
    cm = ContactMessage(
        name=name, email=email, message=message,
        date=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    )
    db.session.add(cm)
    db.session.commit()
    # you can also email here later
    return {"ok": True}

@app.get("/api/whoami")
def whoami():
    if not current_user.is_authenticated:
        return {"authenticated": False}
    return {
        "authenticated": True,
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "is_admin": bool(is_admin_user(current_user)),
    }
@app.get("/api/me")
def api_me():
    if current_user.is_authenticated:
        return jsonify({
            "authenticated": True,
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "is_admin": (current_user.id == 1),
            "avatar": gravatar_url(current_user.email, 64)
        })
    return jsonify({"authenticated": False})

@app.get("/api/admin")
def api_admin():
    admin = db.session.get(User, 1)
    if not admin:
        return jsonify({})
    return jsonify({
        "id": admin.id,
        "name": admin.name,
        "email": admin.email,
        "avatar": gravatar_url(admin.email, 64)
    })

# -----------------------------
# Existing Server-Rendered Routes (Jinja)
# -----------------------------
@app.route('/register', methods=["GET", "POST"])
def register():
    form = RegisterForm()
    if form.validate_on_submit():
        result = db.session.execute(db.select(User).where(User.email == form.email.data))
        user = result.scalar()
        if user:
            flash("You've already signed up with that email, log in instead!")
            return redirect(url_for('login'))
        hash_and_salted_password = generate_password_hash(
            form.password.data, method='pbkdf2:sha256', salt_length=8
        )
        new_user = User(
            email=form.email.data.lower().strip(),
            name=form.name.data.strip(),
            password=hash_and_salted_password,
        )
        db.session.add(new_user)
        db.session.commit()
        login_user(new_user)
        return redirect(url_for("get_all_posts"))
    return render_template("register.html", form=form, current_user=current_user)

@app.route('/login', methods=["GET", "POST"])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        password = form.password.data
        result = db.session.execute(db.select(User).where(User.email == form.email.data.lower().strip()))
        user = result.scalar()
        if not user:
            flash("That email does not exist, please try again.")
            return redirect(url_for('login'))
        elif not check_password_hash(user.password, password):
            flash('Password incorrect, please try again.')
            return redirect(url_for('login'))
        else:
            login_user(user)
            return redirect(url_for('get_all_posts'))
    return render_template("login.html", form=form, current_user=current_user)

@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('get_all_posts'))

@app.route('/')
def get_all_posts():
    result = db.session.execute(db.select(BlogPost))
    posts = result.scalars().all()
    return render_template("index.html", all_posts=posts, current_user=current_user)

@app.route("/post/<int:post_id>", methods=["GET", "POST"])
def show_post(post_id):
    requested_post = db.get_or_404(BlogPost, post_id)
    comment_form = CommentForm()
    if comment_form.validate_on_submit():
        if not current_user.is_authenticated:
            flash("You need to login or register to comment.")
            return redirect(url_for("login"))
        new_comment = Comment(
            text=comment_form.comment_text.data,
            comment_author=current_user,
            parent_post=requested_post
        )
        db.session.add(new_comment)
        db.session.commit()
    return render_template("post.html", post=requested_post, current_user=current_user, form=comment_form)

@app.route("/new-post", methods=["GET", "POST"])
@login_required
def add_new_post():
    form = CreatePostForm()
    if form.validate_on_submit():
        new_post = BlogPost(
            title=form.title.data,
            subtitle=form.subtitle.data,
            body=form.body.data,
            img_url=form.img_url.data,
            author=current_user,
            date=date.today().strftime("%B %d, %Y")
        )
        db.session.add(new_post)
        db.session.commit()
        return redirect(url_for("get_all_posts"))
    return render_template("make-post.html", form=form, current_user=current_user)

@app.route("/edit-post/<int:post_id>", methods=["GET", "POST"])
@admin_only
def edit_post(post_id):
    post = db.get_or_404(BlogPost, post_id)
    edit_form = CreatePostForm(
        title=post.title,
        subtitle=post.subtitle,
        img_url=post.img_url,
        author=post.author,
        body=post.body
    )
    if edit_form.validate_on_submit():
        post.title = edit_form.title.data
        post.subtitle = edit_form.subtitle.data
        post.img_url = edit_form.img_url.data
        post.author = current_user
        post.body = edit_form.body.data
        db.session.commit()
        return redirect(url_for("show_post", post_id=post.id))
    return render_template("make-post.html", form=edit_form, is_edit=True, current_user=current_user)

@app.route("/delete/<int:post_id>")
@admin_only
def delete_post(post_id):
    post_to_delete = db.get_or_404(BlogPost, post_id)
    db.session.delete(post_to_delete)
    db.session.commit()
    return redirect(url_for('get_all_posts'))

@app.route("/about")
def about():
    return render_template("about.html", current_user=current_user)

@app.route("/contact", methods=["GET", "POST"])
def contact():
    # If later you use the email flow, pass msg_sent=True/False for the template
    return render_template("contact.html", current_user=current_user)

# -----------------------------
# React build (production serve)
# -----------------------------
# If you built Vite (frontend/dist exists), serve the SPA files & fallback to index.html.
# This keeps your /api/* and server-rendered routes working alongside the SPA.
@app.get("/spa")
def serve_spa_root():
    index_path = os.path.join(app.static_folder, "index.html")
    if os.path.exists(index_path):
        return send_from_directory(app.static_folder, "index.html")
    return "React build not found. Run: cd frontend && npm run build", 404

@app.get("/spa/<path:path>")
def serve_spa_assets(path):
    file_path = os.path.join(app.static_folder, path)
    index_path = os.path.join(app.static_folder, "index.html")
    if os.path.exists(file_path):
        return send_from_directory(app.static_folder, path)
    if os.path.exists(index_path):
        return send_from_directory(app.static_folder, "index.html")
    return "React build not found. Run: cd frontend && npm run build", 404

# -----------------------------
# Entry
# -----------------------------

# -----------------------------
# REACT SPA FALLBACK (⭐ REQUIRED FOR RENDER)
# -----------------------------

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    """
    Serve index.html for all non-API, non-existing paths
    so React Router works on Render.
    """
    # Do NOT intercept /api/*
    if path.startswith("api"):
        abort(404)

    dist_dir = app.static_folder
    index_path = os.path.join(dist_dir, "index.html")

    # If the file exists in dist, serve it
    file_path = os.path.join(dist_dir, path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(dist_dir, path)

    # Else return index.html for React routes
    return send_from_directory(dist_dir, "index.html")

if __name__ == "__main__":
    # For local dev, Flask runs on :5001; Vite can proxy /api to this.
    app.run(debug=True, port=5001)
