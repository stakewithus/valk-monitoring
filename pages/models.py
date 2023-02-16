from django.db import models

# Create your models here.
class Projects(models.Model):
  projectname = models.CharField(max_length=255)
  network = models.CharField(max_length=255)

  def __str__(self):
        return self.projectname

  class Meta:
        verbose_name_plural = "projects"