import { StaffRegisterPage } from "./StaffRegisterPage";

export function RegisterInstructorPage() {
  return (
    <StaffRegisterPage
      roleName="INSTRUCTOR"
      roleLabel="Instructor"
      emailPlaceholder="instructor@eng.jfn.ac.lk"
      requireDepartment={true}
    />
  );
}
