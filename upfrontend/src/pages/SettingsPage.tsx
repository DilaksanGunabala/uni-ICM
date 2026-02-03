import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, getApiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import { ProfileImageEditor } from "@/components/ui/profile-image-editor";
import { Bell, Shield, User, Mail, Building, IdCard, Loader2, Save, RefreshCw, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileChanged, setProfileChanged] = useState(false);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notification preferences (stored locally for now)
  const [notifications, setNotifications] = useState({
    email: true,
    browser: false,
    approvalReminders: true,
  });

  // Initialize profile form with user data
  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  // Check if profile has changed
  useEffect(() => {
    if (user) {
      const hasChanged =
        profileForm.firstName !== (user.firstName || "") ||
        profileForm.lastName !== (user.lastName || "") ||
        profileForm.email !== (user.email || "");
      setProfileChanged(hasChanged);
    }
  }, [profileForm, user]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleProfileUpdate = async () => {
    if (!profileChanged) return;

    try {
      setProfileLoading(true);

      await api.updateProfile({
        first_name: profileForm.firstName,
        last_name: profileForm.lastName,
        email: profileForm.email,
      });

      // Refresh user data in context
      await refreshUser();

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });
    } catch (error: unknown) {
      console.error("Failed to update profile:", error);
      const message = getApiErrorMessage(error, "Failed to update profile. Please try again.");
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPasswordLoading(true);

      await api.changePassword({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
        confirm_password: passwordForm.confirmPassword,
      });

      // Clear form
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
    } catch (error: unknown) {
      console.error("Failed to change password:", error);
      const message = getApiErrorMessage(error, "Failed to change password. Please try again.");
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRefreshProfile = async () => {
    try {
      await refreshUser();
      toast({
        title: "Profile Refreshed",
        description: "Your profile data has been refreshed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh profile.",
        variant: "destructive",
      });
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      await api.uploadAvatar(file);
      await refreshUser();
      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated successfully.",
      });
    } catch (error: unknown) {
      console.error("Failed to upload avatar:", error);
      const message = getApiErrorMessage(error, "Failed to upload avatar. Please try again.");
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error; // Re-throw to let ProfileImageEditor handle loading state
    }
  };

  const handleAvatarDelete = async () => {
    try {
      await api.deleteAvatar();
      await refreshUser();
      toast({
        title: "Avatar Removed",
        description: "Your profile picture has been removed.",
      });
    } catch (error: unknown) {
      console.error("Failed to delete avatar:", error);
      const message = getApiErrorMessage(error, "Failed to delete avatar. Please try again.");
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error; // Re-throw to let ProfileImageEditor handle loading state
    }
  };

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    hod: "Head of Department",
    lecturer: "Lecturer",
    student: "Student",
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your account settings and preferences"
        breadcrumbs={[{ label: "Settings" }]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your profile details and public information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <ProfileImageEditor
                  currentImage={user?.avatar}
                  name={user?.name || "User"}
                  onUpload={handleAvatarUpload}
                  onDelete={handleAvatarDelete}
                  size="lg"
                />
                <div className="space-y-1">
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Click on photo to change
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    placeholder="Enter your last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Department
                  </Label>
                  <Input
                    value={user?.department || "Not Assigned"}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <IdCard className="h-4 w-4" />
                    {user?.role === "student" ? "Student ID" : "Employee ID"}
                  </Label>
                  <Input
                    value={user?.role === "student" ? (user?.studentId || "N/A") : (user?.employeeId || "N/A")}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="pt-2">
                    <RoleBadge role={user?.role || "student"} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleProfileUpdate}
                  disabled={!profileChanged || profileLoading}
                >
                  {profileLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about marks and approvals
                  </p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Browser Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Get push notifications in your browser
                  </p>
                </div>
                <Switch
                  checked={notifications.browser}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, browser: checked })}
                />
              </div>
              {(user?.role === "hod" || user?.role === "super_admin") && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Approval Reminders</p>
                      <p className="text-sm text-muted-foreground">
                        Reminder for pending approvals
                      </p>
                    </div>
                    <Switch
                      checked={notifications.approvalReminders}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, approvalReminders: checked })}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sun className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how the application looks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label>Theme</Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {/* Light Mode */}
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:bg-accent ${
                      theme === 'light'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`p-3 rounded-full ${theme === 'light' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <Sun className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-sm">Light</span>
                    <span className="text-xs text-muted-foreground">Always use light mode</span>
                  </button>

                  {/* Dark Mode */}
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:bg-accent ${
                      theme === 'dark'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <Moon className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-sm">Dark</span>
                    <span className="text-xs text-muted-foreground">Always use dark mode</span>
                  </button>

                  {/* System Mode */}
                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:bg-accent ${
                      theme === 'system'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`p-3 rounded-full ${theme === 'system' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <Monitor className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-sm">System</span>
                    <span className="text-xs text-muted-foreground">Match system settings</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>
                Manage your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                  />
                </div>
                <div></div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handlePasswordChange}
                disabled={passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-border">
                  {user?.avatar && (
                    <AvatarImage src={user.avatar} alt={user.name} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium">{roleLabels[user?.role || "student"]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">{user?.department || "Not Assigned"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID</span>
                  <span className="font-medium">
                    {user?.role === "student" ? user?.studentId : user?.employeeId || "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                onClick={handleProfileUpdate}
                disabled={!profileChanged || profileLoading}
              >
                {profileLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save All Changes
              </Button>
              <Button variant="outline" className="w-full" onClick={handleRefreshProfile}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
