import { StaffRegisterPage } from "./StaffRegisterPage";

export function RegisterHODPage() {
  return (
    <StaffRegisterPage
      roleName="HOD"
      roleLabel="Head of Department"
      emailPlaceholder="hod@eng.jfn.ac.lk"
      requireDepartment={true}
    />
  );
}
