import { StaffRegisterPage } from "./StaffRegisterPage";

export function RegisterLecturerPage() {
  return (
    <StaffRegisterPage
      roleName="LECTURER"
      roleLabel="Lecturer"
      emailPlaceholder="lecture@eng.jfn.ac.lk"
      requireDepartment={true}
    />
  );
}
