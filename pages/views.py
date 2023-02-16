from django.views.generic import TemplateView
from django.http import HttpResponse
from django.template import loader
from django.contrib.auth import get_user_model
from .models import Projects


class HomePageView(TemplateView):
    template_name = "pages/home.html"


# class UserManagementPageView(TemplateView):
#     users = get_user_model()
#     template_name = "pages/user_management.html"

def users(request):
  users = get_user_model().objects.all().values()
  template = loader.get_template('pages/user_management.html')
  context = {
    'users': users,
  }
  return HttpResponse(template.render(context, request))

def projects(request):
  projects = Projects.objects.all().values()
  template = loader.get_template('pages/home.html')
  context = {
    'projects': projects,
  }
  return HttpResponse(template.render(context, request))
