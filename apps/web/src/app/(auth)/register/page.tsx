'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegister } from '@/features/auth/use-auth';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Use upper, lower & a number'),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Start generating images & video on the campus GPU.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((v) => registerMutation.mutate(v))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              placeholder="Muhammad Rizal Haris"
              autoComplete="name"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@unismuh.ac.id"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>
          <Button
            type="submit"
            variant="gradient"
            className="w-full"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Create account
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
