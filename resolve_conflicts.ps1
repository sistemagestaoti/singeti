$files = @(
    "prisma/sqlite.db",
    "src/app/(authenticated)/connect/ChatInterface.tsx",
    "src/app/(authenticated)/service-desk/[id]/page.tsx",
    "src/app/(authenticated)/service-desk/new/TicketForm.tsx",
    "src/app/(authenticated)/service-desk/page.tsx",
    "src/app/api/branding/route.ts",
    "src/app/api/tickets/[id]/route.ts",
    "src/app/api/tickets/route.ts",
    "src/components/Sidebar.tsx",
    "src/lib/branding.ts"
)

foreach ($file in $files) {
    Write-Host "Resolving: $file"
    git checkout --ours -- $file
    git add -- $file
    Write-Host "Done: $file"
}

Write-Host "All conflicts resolved!"
