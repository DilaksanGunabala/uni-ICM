import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  User,
  IdCard,
  Building2,
  CheckCircle2,
} from "lucide-react";
import api, { getApiErrorMessage } from "@/lib/api";
import { hasValidDomain, DOMAIN_HINT } from "@/lib/emailValidation";

interface PublicDepartment {
  id: number;
  code: string;
  name: string;
}

interface StaffRegisterPageProps {
  roleName: string;           // e.g. "HOD"
  roleLabel: string;          // e.g. "Head of Department"
  emailPlaceholder: string;   // e.g. "hod@eng.jfn.ac.lk"
  requireDepartment: boolean; // false for Dean
}

export function StaffRegisterPage({
  roleName,
  roleLabel,
  emailPlaceholder,
  requireDepartment,
}: StaffRegisterPageProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [departments, setDepartments] = useState<PublicDepartment[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirm_password: "",
    first_name: "",
    last_name: "",
    employee_id: "",
    department_id: "",
  });

  useEffect(() => {
    api
      .getPublicDepartments()
      .then(setDepartments)
      .catch(() => {})
      .finally(() => setLoadingDepts(false));
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const validateForm = (): string | null => {
    if (!formData.first_name.trim()) return "First name is required";
    if (!formData.last_name.trim()) return "Last name is required";
    if (!formData.email.trim()) return "Email is required";
    if (!hasValidDomain(formData.email)) return `Invalid email. ${DOMAIN_HINT}`;
    if (!formData.employee_id.trim()) return "Employee ID is required";
    if (requireDepartment && !formData.department_id)
      return "Please select a department";
    if (!formData.password) return "Password is required";
    if (formData.password.length < 6)
      return "Password must be at least 6 characters";
    if (formData.password !== formData.confirm_password)
      return "Passwords do not match";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      await api.registerStaff({
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirm_password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        employee_id: formData.employee_id,
        department_id: formData.department_id
          ? parseInt(formData.department_id)
          : undefined,
        role_name: roleName,
      });

      setSuccess(true);
      setTimeout(() => navigate("/login"), 4000);
    } catch (error: unknown) {
      setError(
        getApiErrorMessage(error, "Registration failed. Please try again.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted via-background to-muted p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            University Marks Portal
          </h1>
          <p className="text-muted-foreground mt-1">{roleLabel} Registration</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Create your account</CardTitle>
            <CardDescription>
              Register as {roleLabel} — your account will be reviewed by the
              administrator before activation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <h3 className="text-lg font-semibold">Registration Submitted</h3>
                <p className="text-sm text-muted-foreground">
                  Your account is pending approval by the administrator. You
                  will be able to log in once your account has been activated.
                </p>
                <p className="text-xs text-muted-foreground">
                  Redirecting to login page...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="first_name"
                        type="text"
                        placeholder="John"
                        value={formData.first_name}
                        onChange={(e) =>
                          handleChange("first_name", e.target.value)
                        }
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="last_name"
                        type="text"
                        placeholder="Smith"
                        value={formData.last_name}
                        onChange={(e) =>
                          handleChange("last_name", e.target.value)
                        }
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Institutional Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={emailPlaceholder}
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only @eng.jfn.ac.lk addresses are accepted
                  </p>
                </div>

                {/* Employee ID */}
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="employee_id"
                      type="text"
                      placeholder="EMP001"
                      value={formData.employee_id}
                      onChange={(e) =>
                        handleChange("employee_id", e.target.value)
                      }
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Department */}
                <div className="space-y-2">
                  <Label htmlFor="department">
                    Department{!requireDepartment && " (Optional)"}
                  </Label>
                  <Select
                    value={formData.department_id}
                    onValueChange={(value) =>
                      handleChange("department_id", value)
                    }
                    disabled={isLoading || loadingDepts}
                  >
                    <SelectTrigger className="w-full">
                      <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue
                        placeholder={
                          requireDepartment ? "Select department..." : "All departments (optional)"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.code} — {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm_password"
                      type="password"
                      placeholder="Re-enter password"
                      value={formData.confirm_password}
                      onChange={(e) =>
                        handleChange("confirm_password", e.target.value)
                      }
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting registration...
                    </>
                  ) : (
                    "Submit Registration"
                  )}
                </Button>
              </form>
            )}

            {/* Login Link */}
            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()} University Marks Portal. All rights reserved.
        </p>
      </div>
    </div>
  );
}
