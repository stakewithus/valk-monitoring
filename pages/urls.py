from django.urls import path
from . import views
from .views import HomePageView

urlpatterns = [
    path("", views.projects, name="home"),
    path("user_management/", views.users, name="user_management"),
]
